/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Params } from './alert_type_params';
import { AlertExecutorOptions, AlertInstanceContext } from '../../../../alerts/server';

// alert type context provided to actions

type AlertInfo = Pick<AlertExecutorOptions, 'name'>;

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
  // threshold conditions
  conditions: string;
}

export function addMessages(
  alertInfo: AlertInfo,
  baseContext: BaseActionContext,
  params: Params
): ActionContext {
  const title = i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeContextSubjectTitle', {
    defaultMessage: 'alert {name} group {group} exceeded threshold',
    values: {
      name: alertInfo.name,
      group: baseContext.group,
    },
  });

  const window = `${params.timeWindowSize}${params.timeWindowUnit}`;
  const message = i18n.translate(
    'xpack.stackAlerts.indexThreshold.alertTypeContextMessageDescription',
    {
      defaultMessage:
        'alert {name} group {group} value {value} exceeded threshold {conditions} over {window} on {date}',
      values: {
        name: alertInfo.name,
        group: baseContext.group,
        value: baseContext.value,
        conditions: baseContext.conditions,
        window,
        date: baseContext.date,
      },
    }
  );

  return { ...baseContext, title, message };
}
