/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuleExecutorOptions, AlertInstanceContext } from '@kbn/alerting-plugin/server';
import { OnlyEsQueryAlertParams, OnlySearchSourceAlertParams } from './types';

// alert type context provided to actions

type AlertInfo = Pick<RuleExecutorOptions, 'name'>;

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
  hits: estypes.SearchHit[];
  // a link to see records that triggered the alert for Discover alert
  // a link which navigates to stack management in case of Elastic query alert
  link: string;
}

export function addMessages(
  alertInfo: AlertInfo,
  baseContext: EsQueryAlertActionContext,
  params: OnlyEsQueryAlertParams | OnlySearchSourceAlertParams
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
- Timestamp: {date}
- Link: {link}`,
    values: {
      name: alertInfo.name,
      value: baseContext.value,
      conditions: baseContext.conditions,
      window,
      date: baseContext.date,
      link: baseContext.link,
    },
  });

  return { ...baseContext, title, message };
}
