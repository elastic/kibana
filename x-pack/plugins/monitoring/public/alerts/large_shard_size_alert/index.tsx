/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Expression, Props } from '../components/param_details_form/expression';
import { AlertTypeModel, ValidationResult } from '../../../../triggers_actions_ui/public';
import {
  RULE_LARGE_SHARD_SIZE,
  RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import { AlertTypeParams } from '../../../../alerting/common';
import { MonitoringConfig } from '../../types';

interface ValidateOptions extends AlertTypeParams {
  indexPattern: string;
}

const validate = (inputValues: ValidateOptions): ValidationResult => {
  const validationResult = { errors: {} };
  const errors: { [key: string]: string[] } = {
    indexPattern: [],
  };
  if (!inputValues.indexPattern) {
    errors.indexPattern.push(
      i18n.translate('xpack.monitoring.alerts.validation.indexPattern', {
        defaultMessage: 'A valid index pattern/s is required.',
      })
    );
  }
  validationResult.errors = errors;
  return validationResult;
};

export function createLargeShardSizeAlertType(
  config: MonitoringConfig
): AlertTypeModel<ValidateOptions> {
  return {
    id: RULE_LARGE_SHARD_SIZE,
    description: RULE_DETAILS[RULE_LARGE_SHARD_SIZE].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibanaLargeShardSize}`;
    },
    alertParamsExpression: (props: Props) => (
      <Expression
        {...props}
        config={config}
        paramDetails={RULE_DETAILS[RULE_LARGE_SHARD_SIZE].paramDetails}
      />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
  };
}
