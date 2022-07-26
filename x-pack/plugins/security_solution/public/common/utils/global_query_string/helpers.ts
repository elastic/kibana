/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import { decode, encode } from 'rison-node';
import { SecurityPageName } from '../../../app/types';

export const isDetectionsPages = (pageName: string) =>
  pageName === SecurityPageName.alerts ||
  pageName === SecurityPageName.rules ||
  pageName === SecurityPageName.rulesCreate ||
  pageName === SecurityPageName.exceptions;

export const decodeRisonUrlState = <T>(value: string | undefined): T | null => {
  try {
    return value ? (decode(value) as unknown as T) : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return null;
    }
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const encodeRisonUrlState = (state: any) => encode(state);

export const getQueryStringFromLocation = (search: string) => search.substring(1);

export const getParamFromQueryString = (
  queryString: string,
  key: string
): string | undefined | null => {
  const parsedQueryString = parse(queryString, { sort: false });
  const queryParam = parsedQueryString[key];

  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};
