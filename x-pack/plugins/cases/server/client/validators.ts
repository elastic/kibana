/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const validateDuplicatedKeysInRequest = ({
  requestFields = [],
  fieldName,
}: {
  requestFields?: Array<{ key: string }>;
  fieldName: string;
}) => {
  const uniqueKeys = new Set<string>();
  const duplicatedKeys = new Set<string>();

  requestFields.forEach((item) => {
    if (uniqueKeys.has(item.key)) {
      duplicatedKeys.add(item.key);
    } else {
      uniqueKeys.add(item.key);
    }
  });

  if (duplicatedKeys.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated ${fieldName} keys in request: ${Array.from(duplicatedKeys.values())}`
    );
  }
};

/**
 * Throws an error if the request has observable types with duplicated labels.
 */
export const validateDuplicatedLabelsInRequest = ({
  requestFields = [],
  fieldName,
}: {
  requestFields?: Array<{ label: string }>;
  fieldName: string;
}) => {
  const uniqueLabels = new Set<string>();
  const duplicatedLabels = new Set<string>();

  requestFields.forEach((item) => {
    if (uniqueLabels.has(item.label)) {
      duplicatedLabels.add(item.label);
    } else {
      uniqueLabels.add(item.label);
    }
  });

  if (duplicatedLabels.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated ${fieldName} labels in request: ${Array.from(duplicatedLabels.values())}`
    );
  }
};
