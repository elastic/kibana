/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AzureCredentialsType } from '../../../../common/types';

export type AzureCredentialsFields = Record<string, { label: string; type?: 'password' | 'text' }>;

export interface AzureOptionValue {
  label: string;
  info: React.ReactNode;
  fields: AzureCredentialsFields;
}

export type AzureOptions = Record<AzureCredentialsType, AzureOptionValue>;

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: AzureCredentialsFields) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        value: inputVar.value,
      } as const;
    });

export const DEFAULT_AZURE_MANUAL_CREDENTIALS_TYPE = 'manual';

export const getAzureCredentialsFormOptions = (): AzureOptions => ({
  arm_template: {
    label: 'ARM Template',
    info: [],
    fields: {},
  },
  manual: {
    label: i18n.translate('xpack.csp.azureIntegration.credentialType.manualLabel', {
      defaultMessage: 'Manual',
    }),
    info: [],
    fields: {},
  },
});
