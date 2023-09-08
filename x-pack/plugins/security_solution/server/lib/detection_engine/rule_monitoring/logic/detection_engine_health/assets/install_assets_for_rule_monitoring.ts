/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsImporter, Logger } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { cloneDeep } from 'lodash';
import pRetry from 'p-retry';
import { Readable } from 'stream';

import sourceRuleMonitoringDashboard from './dashboard_rule_monitoring.json';
import sourceKibanaEventLogDataView from './data_view_kibana_event_log.json';
import sourceManagedTag from './tag_managed.json';
import sourceSecuritySolutionTag from './tag_security_solution.json';

const MAX_RETRIES = 2;

/**
 * Installs managed assets for monitoring rules and health of Detection Engine.
 */
export const installAssetsForRuleMonitoring = async (
  savedObjectsImporter: ISavedObjectsImporter,
  logger: Logger,
  currentSpaceId: string
): Promise<void> => {
  const operation = async (attemptCount: number) => {
    logger.debug(`Installing assets for rule monitoring (attempt ${attemptCount})...`);

    const assets = getAssetsForRuleMonitoring(currentSpaceId);

    // The assets are marked as "managed: true" at the saved object level, which in the future
    // should be reflected in the UI for the user. Ticket to track:
    // https://github.com/elastic/kibana/issues/140364
    const importResult = await savedObjectsImporter.import({
      readStream: Readable.from(assets),
      managed: true,
      overwrite: true,
      createNewCopies: false,
      refresh: false,
      namespace: spaceIdToNamespace(currentSpaceId),
    });

    importResult.warnings.forEach((w) => {
      logger.warn(w.message);
    });

    if (!importResult.success) {
      const errors = (importResult.errors ?? []).map(
        (e) => `Couldn't import "${e.type}:${e.id}": ${JSON.stringify(e.error)}`
      );

      errors.forEach((e) => {
        logger.error(e);
      });

      // This will retry the operation
      throw new Error(errors.length > 0 ? errors[0] : `Unknown error (attempt ${attemptCount})`);
    }

    logger.debug('Assets for rule monitoring installed');
  };

  await pRetry(operation, { retries: MAX_RETRIES });
};

const getAssetsForRuleMonitoring = (currentSpaceId: string) => {
  const withSpaceId = appendSpaceId(currentSpaceId);

  const assetRuleMonitoringDashboard = cloneDeep(sourceRuleMonitoringDashboard);
  const assetKibanaEventLogDataView = cloneDeep(sourceKibanaEventLogDataView);
  const assetManagedTag = cloneDeep(sourceManagedTag);
  const assetSecuritySolutionTag = cloneDeep(sourceSecuritySolutionTag);

  // Update ids of the assets to include the current space id
  assetRuleMonitoringDashboard.id = withSpaceId('security-detection-rule-monitoring');
  assetManagedTag.id = withSpaceId('fleet-managed');
  assetSecuritySolutionTag.id = withSpaceId('security-solution');

  // Update saved object references of the dashboard accordingly
  assetRuleMonitoringDashboard.references = assetRuleMonitoringDashboard.references.map(
    (reference) => {
      if (reference.id === 'fleet-managed-<spaceId>') {
        return { ...reference, id: assetManagedTag.id };
      }
      if (reference.id === 'security-solution-<spaceId>') {
        return { ...reference, id: assetSecuritySolutionTag.id };
      }

      return reference;
    }
  );

  return [
    assetManagedTag,
    assetSecuritySolutionTag,
    assetKibanaEventLogDataView,
    assetRuleMonitoringDashboard,
  ];
};

const appendSpaceId = (spaceId: string) => (str: string) => `${str}-${spaceId}`;

const spaceIdToNamespace = SavedObjectsUtils.namespaceStringToId;
