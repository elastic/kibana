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
  ALERT_CCR_READ_EXCEPTIONS,
  ALERT_DETAILS,
  ALERT_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';
import { AlertTypeParams } from '../../../../alerts/common';

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

export function createCCRReadExceptionsAlertType(): AlertTypeModel<ValidateOptions> {
  return {
    id: ALERT_CCR_READ_EXCEPTIONS,
    description: ALERT_DETAILS[ALERT_CCR_READ_EXCEPTIONS].description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibana}`;
    },
    alertParamsExpression: (props: Props) => (
      <Expression {...props} paramDetails={ALERT_DETAILS[ALERT_CCR_READ_EXCEPTIONS].paramDetails} />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: ALERT_REQUIRES_APP_CONTEXT,
  };
}
