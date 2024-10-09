/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installKibanaKnowledgeBaseEntries } from '../../../kibana/knowledge_base/install';
import { removeKnowledgeBaseEntries } from '../../../kibana/knowledge_base/remove';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { INSTALL_STATES } from '../../../../../../common/types';

export async function stepInstallKnowledgeBaseAssets(context: InstallContext) {
  const { savedObjectsClient, logger, installedPkg, packageInstallContext, esClient } = context;

  const { miscReferences = [] } = context;
  const references = await withPackageSpan('Install knowledge base assets', () =>
    installKibanaKnowledgeBaseEntries({
      savedObjectsClient,
      packageInstallContext,
      installedPkg,
      logger,
      esClient,
    })
  );

  return { miscReferences: [...miscReferences, references] };
}

export async function cleanUpKnowledgeBaseAssetsStep(context: InstallContext) {
  const {
    logger,
    installedPkg,
    retryFromLastState,
    force,
    initialState,
    esClient,
    savedObjectsClient,
  } = context;

  // In case of retry clean up previous installed knowledge base assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_KNOWLEDGE_BASE_ASSETS &&
    installedPkg?.attributes?.installed_misc &&
    installedPkg.attributes.installed_misc?.length > 0
  ) {
    const { installed_misc: installedObjects = [] } = installedPkg.attributes;
    logger.debug('Retry transition - clean up knowledge base assets first');

    await withPackageSpan('Retry transition - clean up knowledge base assets first', async () => {
      await removeKnowledgeBaseEntries({
        installedObjects,
        savedObjectsClient,
        esClient,
        packageName: installedPkg.attributes.name,
      });
    });
  }
}
