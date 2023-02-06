/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  RulesSettingsFlapping,
  RulesSettingsFlappingProperties,
} from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export const updateFlappingSettings = ({
  http,
  flappingSettings,
}: {
  http: HttpSetup;
  flappingSettings: RulesSettingsFlappingProperties;
}) => {
  let body: string;
  try {
    body = JSON.stringify(flappingSettings);
  } catch (e) {
    throw new Error(`Unable to parse flapping settings update params: ${e}`);
  }
  return http.post<RulesSettingsFlapping>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_flapping`,
    {
      body,
    }
  );
};
