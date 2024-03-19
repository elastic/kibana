/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, partition, toString } from 'lodash';
import type { CaseRequestCustomField, CaseRequestCustomFields } from '../../../common/types/api';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { VALUES_FOR_CUSTOM_FIELDS_MISSING_DEFAULTS } from './constants';
import type { BulkGetOracleRecordsResponse, OracleRecord, OracleRecordError } from './types';

export const isRecordError = (so: OracleRecord | OracleRecordError): so is OracleRecordError =>
  (so as OracleRecordError).error != null;

export const partitionRecordsByError = (
  res: BulkGetOracleRecordsResponse
): [OracleRecord[], OracleRecordError[]] => {
  const [errors, validRecords] = partition(res, isRecordError) as [
    OracleRecordError[],
    OracleRecord[]
  ];

  return [validRecords, errors];
};

export const partitionByNonFoundErrors = <T extends Array<{ statusCode: number }>>(
  errors: T
): [T, T] => {
  const [nonFoundErrors, restOfErrors] = partition(errors, (error) => error.statusCode === 404) as [
    T,
    T
  ];

  return [nonFoundErrors, restOfErrors];
};

export const convertValueToString = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value) || isPlainObject(value)) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '';
    }
  }

  return toString(value);
};

export const buildRequiredCustomFieldsForRequest = (
  customFieldsConfiguration?: CustomFieldsConfiguration
): CaseRequestCustomFields => {
  // only populate with the default value required custom fields missing from the request
  return customFieldsConfiguration
    ? customFieldsConfiguration
        .filter((customFieldConfig) => customFieldConfig.required)
        .map((customFieldConfig) => {
          let value = null;

          if (customFieldConfig.type in VALUES_FOR_CUSTOM_FIELDS_MISSING_DEFAULTS) {
            value =
              customFieldConfig.defaultValue === undefined ||
              customFieldConfig?.defaultValue === null
                ? VALUES_FOR_CUSTOM_FIELDS_MISSING_DEFAULTS[customFieldConfig.type]
                : customFieldConfig?.defaultValue;
          }

          return {
            key: customFieldConfig.key,
            type: customFieldConfig.type,
            value,
          } as CaseRequestCustomField;
        })
    : [];
};

export const constructRequiredKibanaPrivileges = (owner: string): string[] => {
  /**
   * Kibana features privileges are defined in
   * x-pack/plugins/security/server/authorization/privileges/feature_privilege_builder/cases.ts
   */
  return [
    `cases:${owner}/createCase`,
    `cases:${owner}/updateCase`,
    `cases:${owner}/deleteCase`,
    `cases:${owner}/pushCase`,
    `cases:${owner}/createComment`,
    `cases:${owner}/updateComment`,
    `cases:${owner}/deleteComment`,
    `cases:${owner}/findConfigurations`,
  ];
};
