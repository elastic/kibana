/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertTypeParams } from '../../../../alerting/common';
import type { AlertTypeModel, ValidationResult } from '../../../../triggers_actions_ui/public';
import {
  RULE_CCR_READ_EXCEPTIONS,
  RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import type { MonitoringConfig } from '../../types';
import {
  LazyExpression,
  LazyExpressionProps,
} from '../components/param_details_form/lazy_expression';

interface ValidateOptions extends AlertTypeParams {
  duration: string;
}

const validate = (inputValues: ValidateOptions): ValidationResult => {
  const validationResult = { errors: {} };
  const errors: { [key: string]: string[] } = {
    duration: [],
  };
  if (!inputValues.duration) {
    errors.duration.push(
      i18n.translate('xpack.monitoring.alerts.validation.duration', {
        defaultMessage: 'A valid duration is required.',
      })
    );
  }
  validationResult.errors = errors;
  return validationResult;
};

export function createCCRReadExceptionsAlertType(
  config: MonitoringConfig
): AlertTypeModel<ValidateOptions> {
  return {
    id: RULE_CCR_READ_EXCEPTIONS,
    description: RULE_DETAILS[RULE_CCR_READ_EXCEPTIONS].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibanaCCRReadExceptions}`;
    },
    alertParamsExpression: (props: LazyExpressionProps) => (
      <LazyExpression
        {...props}
        config={config}
        paramDetails={RULE_DETAILS[RULE_CCR_READ_EXCEPTIONS].paramDetails}
      />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
  };
}
