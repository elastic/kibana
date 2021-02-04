/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions, AlertInstanceContext } from '../../../../alerts/server';
import { EsQueryAlertParams } from './alert_type_params';
import { ESSearchHit } from '../../../../../typings/elasticsearch';

// alert type context provided to actions

type AlertInfo = Pick<AlertExecutorOptions, 'name'>;

export interface ActionContext extends EsQueryAlertActionContext {
  // a short pre-constructed message which may be used in an action field
  title: string;
  // a longer pre-constructed message which may be used in an action field
  message: string;
}

export interface EsQueryAlertActionContext extends AlertInstanceContext {
  // the date the alert was run as an ISO date
  date: string;
  // the value that met the threshold
  value: number;
  // threshold conditions
  conditions: string;
  // query matches
  hits: ESSearchHit[];
}

export function addMessages(
  alertInfo: AlertInfo,
  baseContext: EsQueryAlertActionContext,
  params: EsQueryAlertParams
): ActionContext {
  const title = i18n.translate('xpack.stackAlerts.esQuery.alertTypeContextSubjectTitle', {
    defaultMessage: `alert '{name}' matched query`,
    values: {
      name: alertInfo.name,
    },
  });

  const window = `${params.timeWindowSize}${params.timeWindowUnit}`;
  const message = i18n.translate('xpack.stackAlerts.esQuery.alertTypeContextMessageDescription', {
    defaultMessage: `alert '{name}' is active:

- Value: {value}
- Conditions Met: {conditions} over {window}
- Timestamp: {date}`,
    values: {
      name: alertInfo.name,
      value: baseContext.value,
      conditions: baseContext.conditions,
      window,
      date: baseContext.date,
    },
  });

  return { ...baseContext, title, message };
}
