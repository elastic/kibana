/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAdditionalScreenReaderOnlyContext = ({
  field,
  value,
}: {
  field: string;
  value?: string[] | string | null;
}): string => {
  if (value == null) {
    return field;
  }

  return Array.isArray(value) ? `${field} ${value.join(' ')}` : `${field} ${value}`;
};
