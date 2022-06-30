/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosResponse, AxiosError } from 'axios';
import { isEmpty, isObjectLike } from 'lodash';
import { addTimeZoneToDate, getErrorMessage } from '../lib/axios_utils';
import * as i18n from './translations';

export const createServiceError = (error: AxiosError, message: string) =>
  new Error(
    getErrorMessage(
      i18n.NAME,
      `${message}. Error: ${error.message} Reason: ${error.response?.statusText}`
    )
  );

export const getPushedDate = (timestamp?: string) => {
  if (timestamp != null) {
    try {
      return new Date(timestamp).toISOString();
    } catch (e) {
      return new Date(addTimeZoneToDate(timestamp)).toISOString();
    }
  }
  return new Date().toISOString();
};

const splitKeys = (key: string) => {
  const split1 = key.split('.');
  const split2 = split1.reduce((acc: string[], k: string) => {
    const newSplit = k.split('[');
    return [...acc, ...newSplit.filter((j) => j !== '')];
  }, []);
  return split2.reduce((acc: string[], k: string) => {
    const newSplit = k.split(']');
    return [...acc, ...newSplit.filter((j) => j !== '')];
  }, []);
};
const findTheValue = (obj: Record<string, Record<string, unknown> | unknown>, keys: string[]) => {
  let currentLevel: unknown = obj;
  keys.forEach((k: string) => {
    // @ts-ignore
    currentLevel = currentLevel[k];
  });
  return currentLevel;
};

export const getObjectValueByKey = (
  obj: Record<string, Record<string, unknown> | unknown>,
  key: string
): string => {
  return findTheValue(obj, splitKeys(key)) as string;
};

export const throwIfResponseIsNotValidSpecial = ({
  res,
  requiredAttributesToBeInTheResponse = [],
}: {
  res: AxiosResponse;
  requiredAttributesToBeInTheResponse?: string[];
}) => {
  const requiredContentType = 'application/json';
  const contentType = res.headers['content-type'] ?? 'undefined';
  const data = res.data;

  /**
   * Check that the content-type of the response is application/json.
   * Then includes is added because the header can be application/json;charset=UTF-8.
   */
  if (!contentType.includes(requiredContentType)) {
    throw new Error(
      `Unsupported content type: ${contentType} in ${res.config.method} ${res.config.url}. Supported content types: ${requiredContentType}`
    );
  }

  /**
   * Check if the response is a JS object (data != null && typeof data === 'object')
   * in case the content type is application/json but for some reason the response is not.
   * Empty responses (204 No content) are ignored because the typeof data will be string and
   * isObjectLike will fail.
   * Axios converts automatically JSON to JS objects.
   */
  if (!isEmpty(data) && !isObjectLike(data)) {
    throw new Error('Response is not a valid JSON');
  }

  if (requiredAttributesToBeInTheResponse.length > 0) {
    const requiredAttributesError = (attr: string) =>
      new Error(`Response is missing at the expected field: ${attr}`);

    /**
     * If the response is an array and requiredAttributesToBeInTheResponse
     * are not empty then we thrown an error assuming that the consumer
     * expects an object response and not an array.
     */
    requiredAttributesToBeInTheResponse.forEach((attr) => {
      // Check only for undefined as null is a valid value
      if (getObjectValueByKey(data, attr) === undefined) {
        throw requiredAttributesError(attr);
      }
    });
  }
};

export const removeSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);
