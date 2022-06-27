/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { MANAGEMENT_DEFAULT_PAGE_SIZE, MANAGEMENT_PAGE_SIZE_OPTIONS } from '../constants';

/**
 * Checks if a given value is either undefined or equal to the default value provided on input
 * @param value
 * @param defaultValue
 */
export const isDefaultOrMissing = <T>(value: T | undefined | 0, defaultValue: T) => {
  return value === undefined || value === defaultValue || value === 0;
};

/**
 * Given an object with url params, and a given key, return back only the first param value (case multiples were defined)
 * @param query
 * @param key
 */
export const extractFirstParamValue = (
  query: querystring.ParsedUrlQuery,
  key: string
): string | undefined => {
  const value = query[key];

  return Array.isArray(value) ? value[value.length - 1] : value;
};

/**
 * Extracts the page number from a url query object `page` param and validates it.
 * @param query
 */
export const extractPageNumber = (query: querystring.ParsedUrlQuery): number => {
  const pageIndex = Number(extractFirstParamValue(query, 'page'));

  return !Number.isFinite(pageIndex) || pageIndex < 1 ? 1 : pageIndex;
};

/**
 * Extracts the page size from a url query object `pageSize` param and validates it
 * @param query
 */
export const extractPageSizeNumber = (query: querystring.ParsedUrlQuery): number => {
  const pageSize = Number(extractFirstParamValue(query, 'pageSize'));

  return MANAGEMENT_PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : MANAGEMENT_DEFAULT_PAGE_SIZE;
};
