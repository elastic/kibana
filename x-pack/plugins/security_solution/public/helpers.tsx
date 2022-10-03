/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID, ALERT_RULE_NAME, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { has, get } from 'lodash/fp';
import React from 'react';
import { matchPath, Redirect } from 'react-router-dom';

import type { Capabilities } from '@kbn/core/public';
import {
  ALERTS_PATH,
  EXCEPTIONS_PATH,
  RULES_PATH,
  SERVER_APP_ID,
  CASES_FEATURE_ID,
  LANDING_PATH,
  CASES_PATH,
} from '../common/constants';
import type { Ecs } from '../common/ecs';
import type {
  FactoryQueryTypes,
  StrategyResponseType,
} from '../common/search_strategy/security_solution';
import type { TimelineEqlResponse } from '../common/search_strategy/timeline';
import type { InspectResponse } from './types';
import { CASES_SUB_PLUGIN_KEY } from './types';

export const getInspectResponse = <T extends FactoryQueryTypes>(
  response: StrategyResponseType<T> | TimelineEqlResponse | undefined,
  prevResponse: InspectResponse
): InspectResponse => ({
  dsl: response?.inspect?.dsl ?? prevResponse?.dsl ?? [],
  response:
    response != null ? [JSON.stringify(response.rawResponse, null, 2)] : prevResponse?.response,
});

export const isDetectionsPath = (pathname: string): boolean => {
  return !!matchPath(pathname, {
    path: `(${ALERTS_PATH}|${RULES_PATH}|${EXCEPTIONS_PATH})`,
    strict: false,
  });
};

export const isSubPluginAvailable = (pluginKey: string, capabilities: Capabilities): boolean => {
  if (CASES_SUB_PLUGIN_KEY === pluginKey) {
    return capabilities[CASES_FEATURE_ID].read_cases === true;
  }
  return capabilities[SERVER_APP_ID].show === true;
};

export const RedirectRoute = React.memo<{ capabilities: Capabilities }>(({ capabilities }) => {
  const overviewAvailable = isSubPluginAvailable('overview', capabilities);
  const casesAvailable = isSubPluginAvailable(CASES_SUB_PLUGIN_KEY, capabilities);
  if (overviewAvailable) {
    return <Redirect to={LANDING_PATH} />;
  }
  if (casesAvailable) {
    return <Redirect to={CASES_PATH} />;
  }
  return <Redirect to={LANDING_PATH} />;
});
RedirectRoute.displayName = 'RedirectRoute';

const siemSignalsFieldMappings: Record<string, string> = {
  [ALERT_RULE_UUID]: 'signal.rule.id',
  [ALERT_RULE_NAME]: 'signal.rule.name',
  [`${ALERT_RULE_PARAMETERS}.filters`]: 'signal.rule.filters',
  [`${ALERT_RULE_PARAMETERS}.language`]: 'signal.rule.language',
  [`${ALERT_RULE_PARAMETERS}.query`]: 'signal.rule.query',
};

const alertFieldMappings: Record<string, string> = {
  'signal.rule.id': ALERT_RULE_UUID,
  'signal.rule.name': ALERT_RULE_NAME,
  'signal.rule.filters': `${ALERT_RULE_PARAMETERS}.filters`,
  'signal.rule.language': `${ALERT_RULE_PARAMETERS}.language`,
  'signal.rule.query': `${ALERT_RULE_PARAMETERS}.query`,
};

/*
 * Deprecation notice: This functionality should be removed when support for signal.* is no longer
 * supported.
 *
 * Selectively returns the AAD field key (kibana.alert.*) or the legacy field
 * (signal.*), whichever is present. For backwards compatibility.
 */
export const getFieldKey = (ecsData: Ecs, field: string): string => {
  const aadField = (alertFieldMappings[field] ?? field).replace('signal', 'kibana.alert');
  const siemSignalsField = (siemSignalsFieldMappings[field] ?? field).replace(
    'kibana.alert',
    'signal'
  );
  if (has(aadField, ecsData)) return aadField;
  return siemSignalsField;
};

/*
 * Deprecation notice: This functionality should be removed when support for signal.* is no longer
 * supported.
 *
 * Selectively returns the AAD field value (kibana.alert.*) or the legacy field value
 * (signal.*), whichever is present. For backwards compatibility.
 */
export const getField = (ecsData: Ecs, field: string) => {
  const aadField = (alertFieldMappings[field] ?? field).replace('signal', 'kibana.alert');
  const siemSignalsField = (siemSignalsFieldMappings[field] ?? field).replace(
    'kibana.alert',
    'signal'
  );
  const parts = aadField.split('.');
  if (parts.includes('parameters') && parts[parts.length - 1] !== 'parameters') {
    const paramsField = parts.slice(0, parts.length - 1).join('.');
    const params = get(paramsField, ecsData);
    const value = get(parts[parts.length - 1], params);
    return value;
  }
  const value = get(aadField, ecsData) ?? get(siemSignalsField, ecsData);

  return value;
};
