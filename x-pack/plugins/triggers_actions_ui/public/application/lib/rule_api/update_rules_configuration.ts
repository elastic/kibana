/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { RulesConfiguration } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export const updateRulesConfiguration = ({
  http,
  rulesConfiguration,
}: {
  http: HttpSetup;
  rulesConfiguration: RulesConfiguration;
}) => {
  let body: string;
  try {
    body = JSON.stringify(rulesConfiguration);
  } catch (e) {
    throw new Error(`Unable to parse rules configuration update params: ${e}`);
  }
  return http.post<RulesConfiguration>(`${INTERNAL_BASE_ALERTING_API_PATH}/_rules_configuration`, {
    body,
  });
};
