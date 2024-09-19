/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneConnectorType, SwimlaneMappingConfig, MappingConfigurationKeys } from './types';
import * as i18n from './translations';

const casesRequiredFields: MappingConfigurationKeys[] = [
  'caseNameConfig',
  'descriptionConfig',
  'commentsConfig',
  'caseIdConfig',
];
const casesFields = [...casesRequiredFields];
const alertsRequiredFields: MappingConfigurationKeys[] = ['ruleNameConfig', 'alertIdConfig'];
const alertsFields = ['severityConfig', 'commentsConfig', ...alertsRequiredFields];

const translationMapping: Record<string, string> = {
  caseIdConfig: i18n.SW_REQUIRED_CASE_ID,
  alertIdConfig: i18n.SW_REQUIRED_ALERT_ID,
  caseNameConfig: i18n.SW_REQUIRED_CASE_NAME,
  descriptionConfig: i18n.SW_REQUIRED_DESCRIPTION,
  commentsConfig: i18n.SW_REQUIRED_COMMENTS,
  ruleNameConfig: i18n.SW_REQUIRED_RULE_NAME,
  severityConfig: i18n.SW_REQUIRED_SEVERITY,
};

export const isValidFieldForConnector = (
  connector: SwimlaneConnectorType,
  field: MappingConfigurationKeys
): boolean => {
  if (connector === SwimlaneConnectorType.All) {
    return true;
  }

  return connector === SwimlaneConnectorType.Alerts
    ? alertsFields.includes(field)
    : casesFields.includes(field);
};

export const validateMappingForConnector = (
  connectorType: SwimlaneConnectorType,
  mapping: SwimlaneMappingConfig
): Record<string, string> => {
  if (connectorType === SwimlaneConnectorType.All || connectorType == null) {
    return {};
  }

  const requiredFields =
    connectorType === SwimlaneConnectorType.Alerts ? alertsRequiredFields : casesRequiredFields;

  return requiredFields.reduce((errors, field) => {
    if (mapping?.[field] == null) {
      errors = { ...errors, [field]: translationMapping[field] };
    }

    return errors;
  }, {} as Record<string, string>);
};
