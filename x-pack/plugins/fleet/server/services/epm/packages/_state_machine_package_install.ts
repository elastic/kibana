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

import type {
  Installation,
  InstallType,
  InstallSource,
  PackageVerificationResult,
} from '../../../types';

import { createRestartInstallation } from './install';
import type { StateMachineDefinition } from './integrations_state_machine';
import { handleStateMachine } from './integrations_state_machine';

export const installStateNames = [
  'create_restart_installation',
  'install_kibana_assets',
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

export async function _stateMachineInstallPackage({
  savedObjectsClient,
  savedObjectsImporter,
  savedObjectTagAssignmentService,
  savedObjectTagClient,
  esClient,
  logger,
  installedPkg,
  packageInstallContext,
  installType,
  installSource,
  spaceId,
  force,
  verificationResult,
  authorizationHeader,
  ignoreMappingUpdateErrors,
  skipDataStreamRollover,
}: {
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
}) {
  const { packageInfo, paths } = packageInstallContext;
  const { name: pkgName, version: pkgVersion, title: pkgTitle } = packageInfo;

  // our install states
  const installStates: StateMachineDefinition<StateNames> = {
    context: {
      savedObjectsClient,
      savedObjectsImporter,
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      pkgName,
      pkgTitle,
      packageInstallContext,
      paths,
      installedPkg,
      logger,
      spaceId,
      assetTags: packageInfo?.asset_tags,
    },
    states: {
      create_restart_installation: {
        nextState: 'install_kibana_assets',
        onTransitionTo: createRestartInstallation,
      },
      install_kibana_assets: {
        onTransitionTo: () => undefined,
        nextState: 'install_ml_model',
      },
      install_ml_model: {
        onTransitionTo: () => undefined,
        nextState: 'install_index_template_pipelines',
      },
      install_index_template_pipelines: {
        onTransitionTo: () => undefined,
        nextState: 'remove_legacy_templates',
      },
      remove_legacy_templates: {
        onTransitionTo: () => undefined,
        nextState: 'update_current_write_indices',
      },
      update_current_write_indices: {
        onTransitionTo: () => undefined,
        nextState: 'install_transforms',
      },
      install_transforms: {
        onTransitionTo: () => undefined,
        nextState: 'delete_previous_pipelines',
      },
      delete_previous_pipelines: {
        onTransitionTo: () => undefined,
        nextState: 'save_archive_entries_from_assets_map',
      },
      save_archive_entries_from_assets_map: {
        onTransitionTo: () => undefined,
        nextState: 'update_so',
      },
      update_so: {
        onTransitionTo: () => undefined,
        nextState: 'end',
      },
    },
  };
  await handleStateMachine('create_restart_installation', installStates);
}
