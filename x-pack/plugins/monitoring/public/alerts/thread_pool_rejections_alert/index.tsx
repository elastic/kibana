/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { RULE_REQUIRES_APP_CONTEXT } from '../../../common/constants';
import type { CommonAlertParamDetails } from '../../../common/types/alerts';
import type { MonitoringConfig } from '../../types';
import {
  LazyExpression,
  LazyExpressionProps,
} from '../components/param_details_form/lazy_expression';

interface ThreadPoolTypes {
  [key: string]: unknown;
}

interface ThreadPoolRejectionAlertDetails {
  label: string;
  description: string;
  paramDetails: CommonAlertParamDetails;
}

export function createThreadPoolRejectionsAlertType(
  alertId: string,
  threadPoolAlertDetails: ThreadPoolRejectionAlertDetails,
  config: MonitoringConfig
): AlertTypeModel {
  return {
    id: alertId,
    description: threadPoolAlertDetails.description,
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.monitoring.alertsKibanaThreadpoolRejections}`;
    },
    alertParamsExpression: (props: LazyExpressionProps) => (
      <>
        <EuiSpacer />
        <LazyExpression
          {...props}
          config={config}
          paramDetails={threadPoolAlertDetails.paramDetails}
        />
      </>
    ),
    validate: (inputValues: ThreadPoolTypes) => {
      const errors: { [key: string]: string[] } = {};
      const value = inputValues.threshold as number;
      if (value < 0) {
        const errStr = i18n.translate('xpack.monitoring.alerts.validation.lessThanZero', {
          defaultMessage: 'This value can not be less than zero',
        });
        errors.threshold = [errStr];
      }

      if (!inputValues.duration) {
        const errStr = i18n.translate('xpack.monitoring.alerts.validation.duration', {
          defaultMessage: 'A valid duration is required.',
        });
        errors.duration = [errStr];
      }

      return { errors };
    },
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
  };
}
