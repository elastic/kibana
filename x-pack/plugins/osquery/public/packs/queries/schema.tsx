/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FIELD_TYPES } from '../../shared_imports';

import {
  createIdFieldValidations,
  intervalFieldValidation,
  queryFieldValidation,
} from './validations';

export const createFormSchema = (ids: Set<string>) => ({
  id: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.osquery.pack.queryFlyoutForm.idFieldLabel', {
      defaultMessage: 'ID',
    }),
    validations: createIdFieldValidations(ids).map((validator) => ({ validator })),
  },
  description: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.osquery.pack.queryFlyoutForm.descriptionFieldLabel', {
      defaultMessage: 'Description (optional)',
    }),
    validations: [],
  },
  query: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.osquery.pack.queryFlyoutForm.queryFieldLabel', {
      defaultMessage: 'Query',
    }),
    validations: [{ validator: queryFieldValidation }],
  },
  interval: {
    defaultValue: 3600,
    type: FIELD_TYPES.NUMBER,
    label: i18n.translate('xpack.osquery.pack.queryFlyoutForm.intervalFieldLabel', {
      defaultMessage: 'Interval (s)',
    }),
    validations: [{ validator: intervalFieldValidation }],
  },
  platform: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.osquery.pack.queryFlyoutForm.platformFieldLabel', {
      defaultMessage: 'Platform',
    }),
    validations: [],
  },
  version: {
    defaultValue: [],
    type: FIELD_TYPES.COMBO_BOX,
    label: (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.osquery.pack.queryFlyoutForm.versionFieldLabel"
            defaultMessage="Minimum Osquery version"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) as unknown as string,
    validations: [],
  },
  ecs_mapping: {
    defaultValue: {},
    type: FIELD_TYPES.JSON,
    validations: [],
  },
});
