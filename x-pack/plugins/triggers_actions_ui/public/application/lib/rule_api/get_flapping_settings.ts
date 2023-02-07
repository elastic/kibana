/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { RulesSettingsFlapping } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export const getFlappingSettings = ({ http }: { http: HttpSetup }) => {
  return http.get<RulesSettingsFlapping>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_flapping`
  );
};
