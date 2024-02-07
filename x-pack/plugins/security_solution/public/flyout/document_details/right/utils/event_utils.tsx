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

export interface EcsMetadata {
  allowed_values?: AllowedValue[];
  dashed_name?: string;
  description?: string;
  example?: string;
  flat_name?: string;
  format?: string;
  ignore_above?: number;
  level?: string;
  name?: string;
  normalize?: string[];
  required?: boolean;
  short?: string;
  type?: string;
}

/**
 * Helper function to return if the value is in the allowed value list of an ecs field
 * @param fieldName
 * @param value
 * @returns boolean if value is an allowed value
 */
export const isEcsAllowedValue = (fieldName: string, value: string | undefined | null): boolean => {
  if (!value || value == null) {
    return false;
  }
  const ecsMetadata = EcsFlat as unknown as Record<string, EcsMetadata>;
  const allowedValues: AllowedValue[] | undefined = ecsMetadata[fieldName]?.allowed_values;
  return Boolean(allowedValues?.find((item) => item.name === value));
};

/**
 * Helper function to return the description of an allowed value of the specified field
 * @param fieldName
 * @param value
 * @returns ecs description of the value
 */
export const getEcsAllowedValueDescription = (fieldName: string, value: string): string => {
  const ecsMetadata = EcsFlat as unknown as Record<string, EcsMetadata>;
  const eventKindArray: AllowedValue[] | undefined = ecsMetadata[fieldName]?.allowed_values;
  return (
    eventKindArray?.find((item) => item.name === value)?.description ??
    i18n.translate('xpack.securitySolution.flyout.right.about.noEventKindDescriptionMessage', {
      defaultMessage: 'This field is not an ecs field, description is not available.',
    })
  );
};

// mapping of event category to the field displayed as title
export const EVENT_CATEGORY_TO_FIELD: Record<string, string> = {
  authentication: '',
  configuration: '',
  database: '',
  driver: '',
  email: '',
  file: '',
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
