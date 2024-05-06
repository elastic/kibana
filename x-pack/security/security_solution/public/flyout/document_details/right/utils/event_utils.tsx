/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import { i18n } from '@kbn/i18n';

export interface AllowedValue {
  description?: string;
  expected_event_types?: string[];
  name?: string;
}

type FieldName = 'event.kind' | 'event.category';

/**
 * Helper function to return if the value is in the allowed value list of an ecs field
 * @param fieldName
 * @param value
 * @returns boolean if value is an allowed value
 */
export const isEcsAllowedValue = (
  fieldName: FieldName,
  value: string | undefined | null
): boolean => {
  if (!value || value == null) {
    return false;
  }
  const allowedValues: AllowedValue[] = EcsFlat[fieldName]?.allowed_values ?? [];
  return Boolean(allowedValues?.find((item) => item.name === value));
};

/**
 * Helper function to return the description of an allowed value of the specified field
 * @param fieldName
 * @param value
 * @returns ecs description of the value
 */
export const getEcsAllowedValueDescription = (fieldName: FieldName, value: string): string => {
  const allowedValues: AllowedValue[] = EcsFlat[fieldName]?.allowed_values ?? [];
  return (
    allowedValues?.find((item) => item.name === value)?.description ??
    i18n.translate('xpack.securitySolution.flyout.right.about.noEventKindDescriptionMessage', {
      defaultMessage: 'This field is not an ecs field, description is not available.',
    })
  );
};

// mapping of event category to the field displayed as title
export const EVENT_CATEGORY_TO_FIELD: Record<string, string> = {
  authentication: 'user.name',
  configuration: '',
  database: '',
  driver: '',
  email: '',
  file: 'file.name',
  host: 'host.name',
  iam: '',
  intrusion_detection: '',
  malware: '',
  network: '',
  package: '',
  process: 'process.name',
  registry: '',
  session: '',
  threat: '',
  vulnerability: '',
  web: '',
};
