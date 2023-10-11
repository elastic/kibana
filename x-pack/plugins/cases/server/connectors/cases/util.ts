/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * groupingDefinition is of the form
 * <fieldKeyA>=<fieldValueA>&<fieldKeyB>=<fieldValueB>.
 * Example: host.ip=0.0.0.1&host.name=A
 *
 * The function assumes that no duplicated field keys
 * exist. Also it assumes the following special characters
 * ":", "=", "&" are escaped property. For example,
 * host.ip=0.0.0.1&host.ip=0.0.0.2 or host.ip=2001:db8::8a2e:370:7334 are not valid
 */

export const sortGroupDefinition = (groupingDefinition: string): string => {
  const fieldMap = new Map<string, string>();
  const fields = groupingDefinition.split('&');

  if (fields.length <= 1) {
    return groupingDefinition;
  }

  for (const field of fields) {
    const [key, value] = field.split('=');
    fieldMap.set(key, value);
  }

  const sortedKeys = Array.from(fieldMap.keys()).sort(sortStings);
  const sortedFields = sortedKeys.map((key) => `${key}=${fieldMap.get(key)}`);

  return sortedFields.join('&');
};

const sortStings = (a: string, b: string) => String(a).localeCompare(b);
