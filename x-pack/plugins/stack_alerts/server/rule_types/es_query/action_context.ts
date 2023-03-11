/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertInstanceContext } from '@kbn/alerting-plugin/server';
import { EsQueryRuleParams } from './rule_type_params';
import { Comparator } from '../../../common/comparator_types';
import { getHumanReadableComparator } from '../../../common';

// rule type context provided to actions
export interface ActionContext extends EsQueryRuleActionContext {
  // a short pre-constructed message which may be used in an action field
  title: string;
  // a longer pre-constructed message which may be used in an action field
  message: string;
}

export interface EsQueryRuleActionContext extends AlertInstanceContext {
  // the date the rule was run as an ISO date
  date: string;
  // the value that met the threshold
  value: number;
  // threshold conditions
  conditions: string;
  // query matches
  hits: estypes.SearchHit[];
  // a link to see records that triggered the rule for Discover rule
  // a link which navigates to stack management in case of Elastic query rule
  link: string;
}

interface AddMessagesOpts {
  ruleName: string;
  baseContext: EsQueryRuleActionContext;
  params: EsQueryRuleParams;
  group?: string;
  isRecovered?: boolean;
}
export function addMessages({
  ruleName,
  baseContext,
  params,
  group,
  isRecovered = false,
}: AddMessagesOpts): ActionContext {
  const title = i18n.translate('xpack.stackAlerts.esQuery.alertTypeContextSubjectTitle', {
    defaultMessage: `rule '{name}' {verb}`,
    values: {
      name: ruleName,
      verb: isRecovered ? 'recovered' : `matched query${group ? ` for group ${group}` : ''}`,
    },
  });

  const window = `${params.timeWindowSize}${params.timeWindowUnit}`;
  const message = i18n.translate('xpack.stackAlerts.esQuery.alertTypeContextMessageDescription', {
    defaultMessage: `rule '{name}' is {verb}:

- Value: {value}
- Conditions Met: {conditions} over {window}
- Timestamp: {date}
- Link: {link}`,
    values: {
      name: ruleName,
      value: baseContext.value,
      conditions: baseContext.conditions,
      window,
      date: baseContext.date,
      link: baseContext.link,
      verb: isRecovered ? 'recovered' : 'active',
    },
  });

  return { ...baseContext, title, message };
}

interface GetContextConditionsDescriptionOpts {
  comparator: Comparator;
  threshold: number[];
  aggType: string;
  aggField?: string;
  isRecovered?: boolean;
  group?: string;
}

export function getContextConditionsDescription({
  comparator,
  threshold,
  aggType,
  aggField,
  isRecovered = false,
  group,
}: GetContextConditionsDescriptionOpts) {
  return i18n.translate('xpack.stackAlerts.esQuery.alertTypeContextConditionsDescription', {
    defaultMessage:
      'Number of matching documents{groupCondition}{aggCondition} is {negation}{thresholdComparator} {threshold}',
    values: {
      aggCondition: aggType === 'count' ? '' : ` where ${aggType} of ${aggField}`,
      groupCondition: group ? ` for group "${group}"` : '',
      thresholdComparator: getHumanReadableComparator(comparator),
      threshold: threshold.join(' and '),
      negation: isRecovered ? 'NOT ' : '',
    },
  });
}
