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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { IAssignmentService, ITagsClient } from '@kbn/saved-objects-tagging-plugin/server';

import { PackageSavedObjectConflictError } from '../../../../errors';

import type { HTTPAuthorizationHeader } from '../../../../../common/http_authorization_header';
import { INSTALL_STATES } from '../../../../../common/types';
import type { PackageInstallContext, StateNames, StateContext } from '../../../../../common/types';
import type { PackageAssetReference } from '../../../../types';

import type {
  Installation,
  InstallType,
  InstallSource,
  PackageVerificationResult,
  EsAssetReference,
  KibanaAssetReference,
  IndexTemplateEntry,
  AssetReference,
} from '../../../../types';

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
  stepResolveKibanaPromise,
  stepSaveSystemObject,
  updateLatestExecutedState,
} from './steps';
import type { StateMachineDefinition } from './state_machine';
import { handleState } from './state_machine';

export interface InstallContext extends StateContext<StateNames> {
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
        onPostTransition: updateLatestExecutedState,
      },
      install_kibana_assets: {
        onTransition: stepInstallKibanaAssets,
        nextState: 'install_ilm_policies',
        onPostTransition: updateLatestExecutedState,
      },
      install_ilm_policies: {
        onTransition: stepInstallILMPolicies,
        nextState: 'install_ml_model',
        onPostTransition: updateLatestExecutedState,
      },
      install_ml_model: {
        onTransition: stepInstallMlModel,
        nextState: 'install_index_template_pipelines',
        onPostTransition: updateLatestExecutedState,
      },
      install_index_template_pipelines: {
        onTransition: stepInstallIndexTemplatePipelines,
        nextState: 'remove_legacy_templates',
        onPostTransition: updateLatestExecutedState,
      },
      remove_legacy_templates: {
        onTransition: stepRemoveLegacyTemplates,
        nextState: 'update_current_write_indices',
        onPostTransition: updateLatestExecutedState,
      },
      update_current_write_indices: {
        onTransition: stepUpdateCurrentWriteIndices,
        nextState: 'install_transforms',
        onPostTransition: updateLatestExecutedState,
      },
      install_transforms: {
        onTransition: stepInstallTransforms,
        nextState: 'delete_previous_pipelines',
        onPostTransition: updateLatestExecutedState,
      },
      delete_previous_pipelines: {
        onTransition: stepDeletePreviousPipelines,
        nextState: 'save_archive_entries_from_assets_map',
        onPostTransition: updateLatestExecutedState,
      },
      save_archive_entries_from_assets_map: {
        onTransition: stepSaveArchiveEntries,
        nextState: 'resolve_kibana_promise',
        onPostTransition: updateLatestExecutedState,
      },
      resolve_kibana_promise: {
        onTransition: stepResolveKibanaPromise,
        nextState: 'update_so',
        onPostTransition: updateLatestExecutedState,
      },
      update_so: {
        onTransition: stepSaveSystemObject,
        nextState: 'end',
        onPostTransition: updateLatestExecutedState,
      },
    },
  };
  try {
    const { installedKibanaAssetsRefs, esReferences } = await handleState(
      INSTALL_STATES.CREATE_RESTART_INSTALLATION,
      installStates,
      installStates.context
    );
    return [
      ...(installedKibanaAssetsRefs as KibanaAssetReference[]),
      ...(esReferences as EsAssetReference[]),
    ];
  } catch (err) {
    const { packageInfo } = installStates.context.packageInstallContext;
    const { name: pkgName, version: pkgVersion } = packageInfo;

    if (SavedObjectsErrorHelpers.isConflictError(err)) {
      throw new PackageSavedObjectConflictError(
        `Saved Object conflict encountered while installing ${pkgName || 'unknown'}-${
          pkgVersion || 'unknown'
        }. There may be a conflicting Saved Object saved to another Space. Original error: ${
          err.message
        }`
      );
    } else {
      throw err;
    }
  }
}
