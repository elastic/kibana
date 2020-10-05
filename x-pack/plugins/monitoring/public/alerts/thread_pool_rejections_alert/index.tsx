/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Expression } from './expression';

import {
  AlertTypeModel,
  AlertTypeParamsExpressionProps,
} from '../../../../triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ThreadPoolRejectionsAlert } from '../../../server/alerts';

interface ThreadPoolRejectionsParam {
  threshold: number;
  enabled: boolean;
}

interface ParamDetails {
  search: { label: string };
  write: { label: string };
  [key: string]: { label: string };
}

interface ThreadPoolTypes {
  [key: string]: ThreadPoolRejectionsParam;
}

export interface Props extends AlertTypeParamsExpressionProps {
  paramDetails: ParamDetails;
  alertParams: { [key: string]: unknown };
}

export function createThreadPoolRejectionsAlertType(): AlertTypeModel {
  return {
    id: ThreadPoolRejectionsAlert.TYPE,
    name: ThreadPoolRejectionsAlert.LABEL,
    iconClass: 'bell',
    alertParamsExpression: (props: Props) => (
      <Expression {...props} paramDetails={ThreadPoolRejectionsAlert.PARAM_DETAILS} />
    ),
    validate: (recentState: ThreadPoolTypes) => {
      const errors: { [key: string]: string[] } = {};
      for (const key in recentState) {
        if (!recentState.hasOwnProperty(key)) {
          continue;
        }
        const value = recentState[key].threshold;
        if (value < 0) {
          const errStr = i18n.translate('xpack.monitoring.alerts.validation.lessThanZero', {
            defaultMessage: `This value can not be less than zero`,
          });
          errors[key] = [errStr];
        }
      }
      return { errors };
    },
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: true,
  };
}
