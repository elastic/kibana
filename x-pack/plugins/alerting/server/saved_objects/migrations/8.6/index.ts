/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { createEsoMigration, pipeMigrations } from '../utils';
import { RawRule, RuleLastRunOutcomeValues } from '../../../types';
import { getDefaultMonitoring } from '../../../lib/monitoring';

const succeededStatus = ['ok', 'active', 'succeeded'];
const warningStatus = ['warning'];
const failedStatus = ['error', 'failed'];

const getLastRun = (attributes: RawRule) => {
  const { executionStatus } = attributes;
  const { status, warning, error } = executionStatus || {};

  let outcome;
  if (succeededStatus.includes(status)) {
    outcome = RuleLastRunOutcomeValues[0];
  } else if (warningStatus.includes(status) || warning) {
    outcome = RuleLastRunOutcomeValues[1];
  } else if (failedStatus.includes(status) || error) {
    outcome = RuleLastRunOutcomeValues[2];
  }

  // Don't set last run if status is unknown or pending, let the
  // task runner do it instead
  if (!outcome) {
    return null;
  }

  return {
    outcome,
    outcomeMsg: warning?.message || error?.message || null,
    warning: warning?.reason || error?.reason || null,
    alertsCount: {},
  };
};

const getMonitoring = (attributes: RawRule) => {
  const { executionStatus, monitoring } = attributes;
  if (!monitoring) {
    if (!executionStatus) {
      return null;
    }

    // monitoring now has data from executionStatus, therefore, we should migrate
    // these fields even if monitoring doesn't exist.
    const defaultMonitoring = getDefaultMonitoring(executionStatus.lastExecutionDate);
    if (executionStatus.lastDuration) {
      defaultMonitoring.run.last_run.metrics.duration = executionStatus.lastDuration;
    }
    return defaultMonitoring;
  }

  const { lastExecutionDate, lastDuration } = executionStatus;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monitoringExecution = (monitoring as any).execution;

  return {
    run: {
      ...monitoringExecution,
      last_run: {
        timestamp: lastExecutionDate,
        metrics: {
          ...(lastDuration ? { duration: lastDuration } : {}),
        },
      },
    },
  };
};

function migrateLastRun(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const { attributes } = doc;
  const lastRun = getLastRun(attributes);
  const monitoring = getMonitoring(attributes);

  return {
    ...doc,
    // @ts-expect-error - we are changing the type of rule.lastRun.outcomeMsg to be string[]
    // instead of string. Since this change was introduced after the migration was created,
    // we will expect the TS error and handle the transformation on the API side.
    attributes: {
      ...attributes,
      ...(lastRun ? { lastRun } : {}),
      ...(monitoring ? { monitoring } : {}),
    },
  };
}

export const getMigrations860 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(migrateLastRun)
  );
