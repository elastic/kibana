/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SavedObject, SavedObjectsImportWarning } from '@kbn/core/server';
import { RawAction } from '../types';

export function getImportWarnings(
  connectors: Array<SavedObject<RawAction>>
): SavedObjectsImportWarning[] {
  const connectorsWithSecrets = connectors.filter(
    (connector) => connector.attributes.isMissingSecrets
  );
  if (connectorsWithSecrets.length === 0) {
    return [];
  }
  const message = i18n.translate('xpack.actions.savedObjects.onImportText', {
    defaultMessage:
      '{connectorsWithSecretsLength} {connectorsWithSecretsLength, plural, one {connector has} other {connectors have}} sensitive information that require updates.',
    values: {
      connectorsWithSecretsLength: connectorsWithSecrets.length,
    },
  });
  return [
    {
      type: 'action_required',
      message,
      actionPath: '/app/management/insightsAndAlerting/triggersActions/connectors',
      buttonLabel: GO_TO_CONNECTORS_BUTTON_LABLE,
    } as SavedObjectsImportWarning,
  ];
}

export const GO_TO_CONNECTORS_BUTTON_LABLE = i18n.translate(
  'xpack.actions.savedObjects.goToConnectorsButtonText',
  { defaultMessage: 'Go to connectors' }
);
