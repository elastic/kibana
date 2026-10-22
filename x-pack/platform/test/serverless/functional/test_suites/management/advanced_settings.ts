/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as settings from '@kbn/management-settings-ids';

const editorSettings = new Set<string>([
  settings.BANNERS_TEXT_CONTENT_ID,
  settings.DATE_FORMAT_SCALED_ID,
  settings.ML_ANOMALY_DETECTION_RESULTS_TIME_DEFAULTS_ID,
  settings.NOTIFICATIONS_BANNER_ID,
  settings.TIMEPICKER_TIME_DEFAULTS_ID,
  settings.TIMEPICKER_QUICK_RANGES_ID,
  settings.SECURITY_SOLUTION_REFRESH_INTERVAL_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_TIME_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_RULES_TABLE_REFRESH_ID,
  settings.SECURITY_SOLUTION_IP_REPUTATION_LINKS_ID,
  settings.OBSERVABILITY_APM_AWS_LAMBDA_PRICE_FACTOR_ID,
  settings.AI_ANONYMIZATION_SETTINGS,
]);
export const isEditorFieldSetting = (settingId: string) => editorSettings.has(settingId);

const globalSettings = new Set<string>([
  settings.ALERTING_V2_ENABLED_SETTING_ID,
  settings.DATA_FEDERATION_ENABLED_SETTING_ID,
  settings.CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID,
  settings.XPACK_CUSTOM_BRANDING_LOGO_ID,
  settings.XPACK_CUSTOM_BRANDING_FAVICON_PNG_ID,
  settings.XPACK_CUSTOM_BRANDING_FAVICON_SVG_ID,
  settings.XPACK_CUSTOM_BRANDING_CUSTOMIZED_LOGO_ID,
]);

export const isGlobalSetting = (settingId: string) => globalSettings.has(settingId);
