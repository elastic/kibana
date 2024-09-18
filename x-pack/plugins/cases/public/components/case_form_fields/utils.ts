/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isInvalidTag = (value: string) => value.trim() === '';

const isTagCharactersInLimit = (value: string, limit: number) => value.trim().length > limit;

export const validateEmptyTags = ({
  value,
  message,
}: {
  value: string | string[];
  message: string;
}) => {
  if (
    (!Array.isArray(value) && isInvalidTag(value)) ||
    (Array.isArray(value) && value.length > 0 && value.find((item) => isInvalidTag(item)))
  ) {
    return {
      message,
    };
  }
};

export const validateMaxLength = ({
  value,
  message,
  limit,
}: {
  value: string | string[];
  message: string;
  limit: number;
}) => {
  if (
    (!Array.isArray(value) && isTagCharactersInLimit(value, limit)) ||
    (Array.isArray(value) &&
      value.length > 0 &&
      value.some((item) => isTagCharactersInLimit(item, limit)))
  ) {
    return {
      message,
    };
  }
};

export const validateMaxTagsLength = ({
  value,
  message,
  limit,
}: {
  value: string | string[];
  message: string;
  limit: number;
}) => {
  if (Array.isArray(value) && value.length > limit) {
    return {
      message,
    };
  }
};
