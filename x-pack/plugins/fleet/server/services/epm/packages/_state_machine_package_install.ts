/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  ISavedObjectsImporter,
} from '@kbn/core/server';

import type { IAssignmentService, ITagsClient } from '@kbn/saved-objects-tagging-plugin/server';

import type { HTTPAuthorizationHeader } from '../../../../common/http_authorization_header';
import type { PackageInstallContext } from '../../../../common/types';
import type { PackageAssetReference } from '../../../types';

import type {
  Installation,
  InstallType,
  InstallSource,
  PackageVerificationResult,
  EsAssetReference,
  KibanaAssetReference,
  IndexTemplateEntry,
  AssetReference,
} from '../../../types';

import {
  stepCreateRestartInstallation,
  stepInstallKibanaAssets,
  stepInstallILMPolicies,
  stepInstallMlModel,
  stepInstallIndexTemplatePipelines,
  stepRemoveLegacyTemplates,
  stepUpdateCurrentWriteIndices,
  stepInstallTransforms,
  stepDeletePreviousPipelines,
  stepSaveArchiveEntries,
  stepSaveSystemObject,
} from './install_steps';
import type { StateMachineDefinition } from './integrations_state_machine';
import { handleState } from './integrations_state_machine';

export const installStateNames = [
  'create_restart_installation',
  'install_kibana_assets',
  'install_ilm_policies',
  'install_ml_model',
  'install_index_template_pipelines',
  'remove_legacy_templates',
  'update_current_write_indices',
  'install_transforms',
  'delete_previous_pipelines',
  'save_archive_entries_from_assets_map',
  'update_so',
] as const;

type StateNamesTuple = typeof installStateNames;
type StateNames = StateNamesTuple[number];

export interface InstallContext {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: Pick<ISavedObjectsImporter, 'import' | 'resolveImportErrors'>;
  savedObjectTagAssignmentService: IAssignmentService;
  savedObjectTagClient: ITagsClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  installedPkg?: SavedObject<Installation>;
  packageInstallContext: PackageInstallContext;
  installType: InstallType;
  installSource: InstallSource;
  spaceId: string;
  force?: boolean;
  verificationResult?: PackageVerificationResult;
  authorizationHeader?: HTTPAuthorizationHeader | null;
  ignoreMappingUpdateErrors?: boolean;
  skipDataStreamRollover?: boolean;

  indexTemplates?: IndexTemplateEntry[];
  packageAssetRefs?: PackageAssetReference[];
  // output values
  esReferences?: EsAssetReference[];
  kibanaAssetPromise?: Promise<KibanaAssetReference[]>;
}

export async function _stateMachineInstallPackage(
  context: InstallContext
): Promise<AssetReference[]> {
  const installStates: StateMachineDefinition<StateNames> = {
    context,
    states: {
      create_restart_installation: {
        nextState: 'install_kibana_assets',
        onTransition: stepCreateRestartInstallation,
      },
      install_kibana_assets: {
        onTransition: stepInstallKibanaAssets,
        nextState: 'install_ilm_policies',
      },
      install_ilm_policies: {
        onTransition: stepInstallILMPolicies,
        nextState: 'install_ml_model',
      },
      install_ml_model: {
        onTransition: stepInstallMlModel,
        nextState: 'install_index_template_pipelines',
      },
      install_index_template_pipelines: {
        onTransition: stepInstallIndexTemplatePipelines,
        nextState: 'remove_legacy_templates',
      },
      remove_legacy_templates: {
        onTransition: stepRemoveLegacyTemplates,
        nextState: 'update_current_write_indices',
      },
      update_current_write_indices: {
        onTransition: stepUpdateCurrentWriteIndices,
        nextState: 'install_transforms',
      },
      install_transforms: {
        onTransition: stepInstallTransforms,
        nextState: 'delete_previous_pipelines',
      },
      delete_previous_pipelines: {
        onTransition: stepDeletePreviousPipelines,
        nextState: 'save_archive_entries_from_assets_map',
      },
      save_archive_entries_from_assets_map: {
        onTransition: stepSaveArchiveEntries,
        nextState: 'update_so',
      },
      update_so: {
        onTransition: stepSaveSystemObject,
        nextState: 'end',
      },
    },
  };
  const { installedKibanaAssetsRefs, esReferences } = await handleState(
    'create_restart_installation',
    installStates,
    installStates.context
  );
  return [
    ...(installedKibanaAssetsRefs as KibanaAssetReference[]),
    ...(esReferences as EsAssetReference[]),
  ];
}
