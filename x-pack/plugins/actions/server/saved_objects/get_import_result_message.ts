/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SavedObject } from 'kibana/server';
import { RawAction } from '../types';

export function getImportResultMessage(connectors: Array<SavedObject<RawAction>>) {
  const connectorsWithSecrets = connectors.filter(
    (connector) => connector.attributes.isMissingSecrets
  );
  return i18n.translate('xpack.actions.savedObjects.onImportText', {
    defaultMessage:
      '{connectorsWithSecretsLength} {connectorsWithSecretsLength, plural, one {connector has} other {connectors have}} secrets that require updates.',
    values: {
      connectorsWithSecretsLength: connectorsWithSecrets.length,
    },
  });
}

export const GO_TO_CONNECTORS_BUTTON_LABLE = 'Go to connectors';
