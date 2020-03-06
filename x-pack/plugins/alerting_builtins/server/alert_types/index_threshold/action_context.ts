/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Params } from './alert_type_params';

// alert type context provided to actions

export interface ActionContext extends BaseActionContext {
  // a short generic message which may be used in an action message
  subject: string;
  // a longer generic message which may be used in an action message
  message: string;
}

export interface BaseActionContext {
  // the alert name
  name: string;
  // the spaceId of the alert
  spaceId: string;
  // the namespace of the alert (spaceId === (namespace || 'default')
  namespace?: string;
  // the alert tags
  tags?: string[];
  // the aggType used in the alert
  // the value of the aggField, if used, otherwise 'all documents'
  group: string;
  // the date the alert was run as an ISO date
  date: string;
  // the value that met the threshold
  value: number;
}

export function addMessages(c: BaseActionContext, p: Params): ActionContext {
  const subject = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.alertTypeContextSubjectTitle',
    {
      defaultMessage: 'alert {name} group {group} exceeded threshold',
      values: {
        name: c.name,
        group: c.group,
      },
    }
  );

  const agg = p.aggField ? `${p.aggType}(${p.aggField})` : `${p.aggType}`;
  const humanFn = `${agg} ${p.thresholdComparator} ${p.threshold.join(',')}`;

  const window = `${p.timeWindowSize}${p.timeWindowUnit}`;
  const message = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.alertTypeContextMessageDescription',
    {
      defaultMessage:
        'alert {name} group {group} value {value} exceeded threshold {function} over {window} on {date}',
      values: {
        name: c.name,
        group: c.group,
        value: c.value,
        function: humanFn,
        window,
        date: c.date,
      },
    }
  );

  return { ...c, subject, message };
}
