/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationFn,
  SavedObjectReference,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from 'kibana/server';
import { isString } from 'lodash/fp';
import { truncateMessage } from '../../rule_execution_log';
import { IRuleSavedAttributesSavedObjectAttributes } from '../types';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleReference } from './legacy_utils';

export const truncateMessageFields: SavedObjectMigrationFn<Record<string, unknown>> = (doc) => {
  const { lastFailureMessage, lastSuccessMessage, ...otherAttributes } = doc.attributes;

  return {
    ...doc,
    attributes: {
      ...otherAttributes,
      lastFailureMessage: truncateMessage(lastFailureMessage),
      lastSuccessMessage: truncateMessage(lastSuccessMessage),
    },
    references: doc.references ?? [],
  };
};

/**
 * This migrates alertId within legacy `siem-detection-engine-rule-status` to saved object references on an upgrade.
 * We only migrate alertId if we find these conditions:
 *   - alertId is a string and not null, undefined, or malformed data.
 *   - The existing references do not already have a alertId found within it.
 *
 * Some of these issues could crop up during either user manual errors of modifying things, earlier migration
 * issues, etc... so we are safer to check them as possibilities
 *
 * @deprecated Remove this once we've fully migrated to event-log and no longer require addition status SO (8.x)
 * @param doc The document having an alertId to migrate into references
 * @returns The document migrated with saved object references
 */
export const legacyMigrateRuleAlertIdSOReferences = (
  doc: SavedObjectUnsanitizedDoc<IRuleSavedAttributesSavedObjectAttributes>
): SavedObjectSanitizedDoc<IRuleSavedAttributesSavedObjectAttributes> => {
  const { alertId, ...otherAttributes } = doc.attributes;
  const existingReferences = doc.references ?? [];

  // early return if alertId is not a string as expected
  if (!isString(alertId)) {
    return { ...doc, references: existingReferences };
  }

  const alertReferences = legacyMigrateAlertId({
    alertId,
    existingReferences,
  });

  return {
    ...doc,
    attributes: otherAttributes,
    references: [...existingReferences, ...alertReferences],
  };
};

/**
 * This is a helper to migrate "alertId"
 *
 * @deprecated Remove this once we've fully migrated to event-log and no longer require addition status SO (8.x)
 *
 * @param existingReferences The existing saved object references
 * @param alertId The alertId to migrate
 *
 * @returns The savedObjectReferences migrated
 */
export const legacyMigrateAlertId = ({
  existingReferences,
  alertId,
}: {
  existingReferences: SavedObjectReference[];
  alertId: string;
}): SavedObjectReference[] => {
  const existingReferenceFound = existingReferences.find((reference) => {
    return reference.id === alertId && reference.type === 'alert';
  });
  if (existingReferenceFound) {
    return [];
  } else {
    return [legacyGetRuleReference(alertId)];
  }
};

/**
 * This side-car rule status SO is deprecated and is to be replaced by the RuleExecutionLog on Event-Log and
 * additional fields on the Alerting Framework Rule SO.
 *
 * @deprecated Remove this once we've fully migrated to event-log and no longer require addition status SO (8.x)
 */
export const legacyRuleStatusSavedObjectMigration = {
  '7.15.2': truncateMessageFields,
  '7.16.0': legacyMigrateRuleAlertIdSOReferences,
};
