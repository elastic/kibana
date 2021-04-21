/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Params } from './alert_type_params';
import { AlertInstanceContext } from '../../../../alerting/server';
import { renderIndexThresholdParams } from '../../../common';

// alert type context provided to actions

export interface ActionContext extends BaseActionContext {
  // a short pre-constructed message which may be used in an action field
  title: string;
  // a longer pre-constructed message which may be used in an action field
  message: string;
}

export interface BaseActionContext extends AlertInstanceContext {
  // the aggType used in the alert
  // the value of the aggField, if used, otherwise 'all documents'
  group: string;
  // the date the alert was run as an ISO date
  date: string;
  // the value that met the threshold
  value: number;
}

export function addMessages(
  alertName: string,
  baseContext: BaseActionContext,
  params: Params
): ActionContext {
  const title = i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeContextSubjectTitle', {
    defaultMessage: 'alert {name} group {group} met threshold',
    values: {
      name: alertName,
      group: baseContext.group,
    },
  });

  const message = i18n.translate(
    'xpack.stackAlerts.indexThreshold.alertTypeContextMessageDescription',
    {
      defaultMessage: `alert '{name}' is active for group '{group}':

- Value: {value}
- Conditions Met: {conditionsMet}
- Timestamp: {date}`,
      values: {
        name: alertName,
        group: baseContext.group,
        value: baseContext.value,
        conditionsMet: renderIndexThresholdParams(params),
        date: baseContext.date,
      },
    }
  );

  return { ...baseContext, title, message };
}
