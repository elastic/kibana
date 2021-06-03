/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneConnectorType, SwimlaneMappingConfig } from './types';
import * as i18n from './translations';

const casesRequiredFields = [
  'caseNameConfig',
  'descriptionConfig',
  'commentsConfig',
  'caseIdConfig',
];
const casesFields = [...casesRequiredFields];
const alertsRequiredFields = ['ruleNameConfig', 'alertIdConfig'];
const alertsFields = [
  'alertSourceConfig',
  'severityConfig',
  'commentsConfig',
  ...alertsRequiredFields,
];

const translationMapping: Record<string, string> = {
  caseIdConfig: i18n.SW_REQUIRED_CASE_ID,
  alertIdConfig: i18n.SW_REQUIRED_ALERT_ID,
  caseNameConfig: i18n.SW_REQUIRED_CASE_NAME,
  descriptionConfig: i18n.SW_REQUIRED_DESCRIPTION,
  commentsConfig: i18n.SW_REQUIRED_COMMENTS,
  ruleNameConfig: i18n.SW_REQUIRED_RULE_NAME,
  alertSourceConfig: i18n.SW_REQUIRED_ALERT_SOURCE,
  severityConfig: i18n.SW_REQUIRED_SEVERITY,
};

export const isValidFieldForConnector = (
  connector: SwimlaneConnectorType,
  field: string
): boolean => {
  if (connector === SwimlaneConnectorType.All) {
    return true;
  }

  return connector === SwimlaneConnectorType.Alerts
    ? alertsFields.includes(field)
    : casesFields.includes(field);
};

export const validateMappingForConnector = (
  connector: SwimlaneConnectorType,
  mapping: SwimlaneMappingConfig
): Record<string, string> =>
  Object.keys(mapping ?? {}).reduce((errors, key) => {
    if (connector !== SwimlaneConnectorType.All) {
      const isFieldRequired =
        connector === SwimlaneConnectorType.Alerts
          ? alertsRequiredFields.includes(key)
          : casesRequiredFields.includes(key);

      if (isFieldRequired && mapping != null && mapping[key] == null) {
        errors = { ...errors, [key]: translationMapping[key] };
      }
    }

    return errors;
  }, {} as Record<string, string>);
