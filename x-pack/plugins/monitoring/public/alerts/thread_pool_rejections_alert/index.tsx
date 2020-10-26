/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { Expression, Props } from '../components/duration/expression';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { CommonAlertParamDetails } from '../../../common/types';

interface ThreadPoolTypes {
  [key: string]: unknown;
}

interface ThreadPoolRejectionAlertClass {
  TYPE: string;
  LABEL: string;
  PARAM_DETAILS: CommonAlertParamDetails;
}

export function createThreadPoolRejectionsAlertType(
  threadPoolAlertClass: ThreadPoolRejectionAlertClass
): AlertTypeModel {
  return {
    id: threadPoolAlertClass.TYPE,
    name: threadPoolAlertClass.LABEL,
    iconClass: 'bell',
    alertParamsExpression: (props: Props) => (
      <>
        <EuiSpacer />
        <Expression {...props} paramDetails={threadPoolAlertClass.PARAM_DETAILS} />
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
    requiresAppContext: true,
  };
}
