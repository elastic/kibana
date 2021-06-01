/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneConnectorType, SwimlaneMappingConfig } from './types';
import * as i18n from './translations';

const casesRequiredFields = ['caseNameConfig', 'descriptionConfig', 'commentsConfig'];
const casesFields = ['caseIdConfig', ...casesRequiredFields];
const alertsRequiredFields = ['alertNameConfig'];
const alertsFields = [
  'alertSourceConfig',
  'severityConfig',
  'commentsConfig',
  ...alertsRequiredFields,
];

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
        errors = { ...errors, [key]: i18n.SW_FIELD_MAPPING_IS_REQUIRED };
      }
    }

    return errors;
  }, {} as Record<string, string>);
