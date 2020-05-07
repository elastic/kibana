/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { camelCase, snakeCase } from 'lodash';
import { flatten } from '../../common/lib';
import { cleanSettings } from './clean_settings';

interface RepositorySettings {
  [key: string]: any;
}

const booleanizeValue = (value: any) => {
  if (value === 'true') {
    return true;
  } else if (value === 'false') {
    return false;
  }
  return value;
};

export const deserializeRepositorySettings = (settings: RepositorySettings): RepositorySettings => {
  // HDFS repositories return settings like:
  // `{ security: { principal: 'some_value'}, conf: { foo: { bar: 'another_value' }}}`
  // Flattening such settings makes it easier to consume in the UI, for both viewing and updating
  const flattenedSettings: RepositorySettings = flatten(settings);
  const deserializedSettings: RepositorySettings = {};

  Object.entries(flattenedSettings).forEach(([key, value]) => {
    // Avoid camel casing keys that are the result of being flattened, such as `security.principal` and `conf.*`
    if (key.includes('.')) {
      deserializedSettings[key] = booleanizeValue(value);
    } else {
      deserializedSettings[camelCase(key)] = booleanizeValue(value);
    }
  });

  return deserializedSettings;
};

export const serializeRepositorySettings = (settings: RepositorySettings): RepositorySettings => {
  const serializedSettings: RepositorySettings = {};

  Object.entries(settings).forEach(([key, value]) => {
    // Avoid snake casing keys that are the result of being flattened, such as `security.principal` and `conf.*`
    if (key.includes('.')) {
      serializedSettings[key] = value;
    } else {
      serializedSettings[snakeCase(key)] = value;
    }
  });

  return cleanSettings(serializedSettings);
};
