/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, set } from 'lodash/fp';
import { renderMustacheObject } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { RenderParameterTemplates } from '@kbn/actions-plugin/server/types';
import { SUB_ACTION } from '../../../../common/connector_types/security/tines/constants';
import { TinesRunActionParams } from '../../../../common/connector_types/security/tines/types';

type Alert = Record<string, unknown>;
type ContextAlerts = Alert[];
type Variables = Record<string, { alerts: ContextAlerts }>;
type Data = Record<string, { alerts: ContextAlerts }>;

const DEDUP_SEPARATOR = '#,#' as const;

export const renderParameterTemplates: RenderParameterTemplates<ExecutorParams> = (
  params,
  variables
) => {
  if (params?.subAction !== SUB_ACTION.RUN) return params;
  let renderedBody: string;
  try {
    const dedupedVariables = getDedupedVariables(
      variables as Variables,
      params?.subActionParams?.dedupKey as string
    );
    renderedBody = render(params.subActionParams.body as string, dedupedVariables);
  } catch (err) {
    renderedBody = `error rendering mustache template "${params.subActionParams.body}": ${err.message}`;
  }
  return set('subActionParams.body', renderedBody, params);
};

export function render(body: string, variables: Record<string, unknown>): string {
  let renderedBody: string;
  try {
    const parsed = JSON.parse(body);
    const rendered: Record<string, string> = renderMustacheObject(parsed, variables);
    const cleaned = cleanTrailingCommaValues(rendered);
    renderedBody = JSON.stringify(cleaned);
  } catch (err) {
    renderedBody = `error rendering mustache template "${body}": ${err.message}`;
  }
  return renderedBody;
}

function getDedupedVariables(variables: Variables, dedupKey?: string): Variables {
  if (!dedupKey) return variables;
  const dedupFields = dedupKey.replace(/\s*/g, '').split(',');
  const dedupCache = new Set();
  const dedupedAlerts = variables.context.alerts.filter((alert) => {
    const dedupValue = dedupFields.map((field) => get(field, alert) ?? '').join(DEDUP_SEPARATOR);
    if (dedupCache.has(dedupValue)) {
      return false;
    }
    dedupCache.add(dedupValue);
    return true;
  });
  const dedupedVariables = set('context.alerts', dedupedAlerts, variables);

  return dedupedVariables;
}

export const renderParameterTemplates2: RenderParameterTemplates<ExecutorParams> = (
  params,
  variables
) => {
  if (params.subAction !== SUB_ACTION.RUN) return params;
  const subActionParams = params.subActionParams as TinesRunActionParams;

  const data = variables as Data;
  const dedupKey = subActionParams.dedupKey as string | undefined;
  if (!dedupKey) {
    return getParamsWithResult(params, [getDataWithCleanAlerts(data, data.context.alerts)]);
  }

  const groupingFields = dedupKey.replace(/\s*/g, '').split(',');
  const dedupedAlerts = data.context.alerts.reduce<Record<string, Data>>((groups, alert) => {
    const groupKey = groupingFields.map((field) => get(field, alert) ?? '').join(DEDUP_SEPARATOR);
    if (groups[groupKey] == null) {
      groups[groupKey] = getDataWithAlerts(data, [getCleanAlert(alert)]);
    } else {
      groups[groupKey].context.alerts.push(getCleanAlert(alert));
    }
    return groups;
  }, {});

  return getParamsWithResult(params, Object.values(dedupedAlerts));
};

// Removes the kibana entry from the content to make it lighter.
const getCleanAlert = ({ kibana, ...alert }: Alert): Alert => alert;

const getDataWithCleanAlerts = (data: Data, alerts: Alert[]) =>
  getDataWithAlerts(
    data,
    alerts.map((alert) => getCleanAlert(alert))
  );

const getDataWithAlerts = (data: Data, alerts: ContextAlerts) => ({
  ...data,
  context: {
    ...data.context,
    alerts,
  },
});

const getParamsWithResult = (params: ExecutorParams, results: unknown[]): ExecutorParams => {
  let paramsWithPayload: ExecutorParams;
  try {
    const strResults = results.map((result) => JSON.stringify(result));
    paramsWithPayload = set('subActionParams.results', strResults, params);
  } catch (err) {
    const result = `error parsing data: ${err.message}`;
    paramsWithPayload = set('subActionParams.results', [result], params);
  }
  return paramsWithPayload;
};

function cleanTrailingCommaValues(input: Record<string, string>) {
  const cleaned: Record<string, string> = {};
  Object.entries(input).forEach(([key, value]) => {
    cleaned[key] = value.replace(/,$/, '');
  });
  return cleaned;
}
