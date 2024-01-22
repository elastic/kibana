/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FILTER_OPTIONS } from '../../../containers/constants';

/**
 * Parses filter options from a URL query string.
 *
 * The behavior is influenced by the predefined DEFAULT_FILTER_OPTIONS:
 * - If an option is defined as an array there, it will always be returned as an array.
 * - Parameters in the query string can have multiple formats:
 *   1. Comma-separated values (e.g., "status=foo,bar")
 *   2. A single value (e.g., "status=foo")
 *   3. Repeated keys (e.g., "status=foo&status=bar")
 *
 * This function ensures the output respects the format indicated in DEFAULT_FILTER_OPTIONS.
 */
export const parseURLWithFilterOptions = (search: string) => {
  const urlParams = new URLSearchParams(search);

  const paramKeysWithTypeArray = Object.entries(DEFAULT_FILTER_OPTIONS)
    .map(([key, val]) => (Array.isArray(val) ? key : undefined))
    .filter(Boolean);

  const parsedUrlParams: { [key in string]: string[] | string } = {};
  for (const [key, value] of urlParams.entries()) {
    if (paramKeysWithTypeArray.includes(key)) {
      if (!parsedUrlParams[key]) parsedUrlParams[key] = [];
      // only applies if the value is separated by commas (e.g., "foo,bar")
      const splittedValues = value.split(',').filter(Boolean);
      (parsedUrlParams[key] as string[]).push(...splittedValues);
    } else {
      parsedUrlParams[key] = value;
    }
  }

  return parsedUrlParams;
};
