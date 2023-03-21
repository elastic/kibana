/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosResponse, AxiosError } from 'axios';
import { isEmpty, isObjectLike, get } from 'lodash';
import { getErrorMessage } from '@kbn/actions-plugin/server/lib/axios_utils';
import * as i18n from './translations';

export const createServiceError = (error: AxiosError, message: string) => {
  const serverResponse =
    error.response && error.response.data ? JSON.stringify(error.response.data) : null;

  return new Error(
    getErrorMessage(
      i18n.NAME,
      `${message}. Error: ${error.message}. ${serverResponse != null ? serverResponse : ''} ${
        error.response?.statusText != null ? `Reason: ${error.response?.statusText}` : ''
      }`
    )
  );
};

export const getObjectValueByKeyAsString = (
  obj: Record<string, Record<string, unknown> | unknown>,
  key: string
): string | undefined => {
  const value = get(obj, key);
  return value === undefined ? value : `${value}`;
};

export const throwDescriptiveErrorIfResponseIsNotValid = ({
  res,
  requiredAttributesToBeInTheResponse = [],
}: {
  res: AxiosResponse;
  requiredAttributesToBeInTheResponse?: string[];
}) => {
  const requiredContentType = 'application/json';
  const contentType = res.headers['content-type'];
  const data = res.data;

  /**
   * Check that the content-type of the response is application/json.
   * Then includes is added because the header can be application/json;charset=UTF-8.
   */
  if (contentType == null) {
    throw new Error(
      `Missing content type header in ${res.config.method} ${res.config.url}. Supported content types: ${requiredContentType}`
    );
  }
  if (!contentType.includes(requiredContentType)) {
    throw new Error(
      `Unsupported content type: ${contentType} in ${res.config.method} ${res.config.url}. Supported content types: ${requiredContentType}`
    );
  }

  if (!isEmpty(data) && !isObjectLike(data)) {
    throw new Error('Response is not a valid JSON');
  }

  if (requiredAttributesToBeInTheResponse.length > 0) {
    const requiredAttributesError = (attrs: string[]) =>
      new Error(
        `Response is missing the expected ${attrs.length > 1 ? `fields` : `field`}: ${attrs.join(
          ', '
        )}`
      );

    const errorAttributes: string[] = [];
    /**
     * If the response is an array and requiredAttributesToBeInTheResponse
     * are not empty then we throw an error if we are missing data for the given attributes
     */
    requiredAttributesToBeInTheResponse.forEach((attr) => {
      // Check only for undefined as null is a valid value
      if (typeof getObjectValueByKeyAsString(data, attr) === 'undefined') {
        errorAttributes.push(attr);
      }
    });
    if (errorAttributes.length) {
      throw requiredAttributesError(errorAttributes);
    }
  }
};

export const removeSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

export const stringifyObjValues = (properties: Record<string, string | string[]>) => ({
  case: Object.entries(properties).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: JSON.stringify(value) }),
    {}
  ),
});
