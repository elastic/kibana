/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { IHTTPSimpleFields, IHTTPAdvancedFields, ITLSFields, ConfigKeys } from '../types';
import {
  HTTPSimpleFieldsContextProvider,
  HTTPAdvancedFieldsContextProvider,
  TLSFieldsContextProvider,
} from '.';

interface HTTPContextProviderProps {
  defaultValues?: any;
  children: ReactNode;
}

export const HTTPContextProvider = ({ defaultValues, children }: HTTPContextProviderProps) => {
  const httpAdvancedFields: IHTTPAdvancedFields | undefined = defaultValues
    ? {
        [ConfigKeys.USERNAME]: defaultValues[ConfigKeys.USERNAME],
        [ConfigKeys.PASSWORD]: defaultValues[ConfigKeys.PASSWORD],
        [ConfigKeys.PROXY_URL]: defaultValues[ConfigKeys.PROXY_URL],
        [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]:
          defaultValues[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE],
        [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]:
          defaultValues[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE],
        [ConfigKeys.RESPONSE_BODY_INDEX]: defaultValues[ConfigKeys.RESPONSE_BODY_INDEX],
        [ConfigKeys.RESPONSE_HEADERS_CHECK]: defaultValues[ConfigKeys.RESPONSE_HEADERS_CHECK],
        [ConfigKeys.RESPONSE_HEADERS_INDEX]: defaultValues[ConfigKeys.RESPONSE_HEADERS_INDEX],
        [ConfigKeys.RESPONSE_STATUS_CHECK]: defaultValues[ConfigKeys.RESPONSE_STATUS_CHECK],
        [ConfigKeys.REQUEST_BODY_CHECK]: defaultValues[ConfigKeys.REQUEST_BODY_CHECK],
        [ConfigKeys.REQUEST_HEADERS_CHECK]: defaultValues[ConfigKeys.REQUEST_HEADERS_CHECK],
        [ConfigKeys.REQUEST_METHOD_CHECK]: defaultValues[ConfigKeys.REQUEST_METHOD_CHECK],
      }
    : undefined;
  const httpSimpleFields: IHTTPSimpleFields | undefined = defaultValues
    ? {
        [ConfigKeys.APM_SERVICE_NAME]: defaultValues[ConfigKeys.APM_SERVICE_NAME],
        [ConfigKeys.MAX_REDIRECTS]: defaultValues[ConfigKeys.MAX_REDIRECTS],
        [ConfigKeys.MONITOR_TYPE]: defaultValues[ConfigKeys.MONITOR_TYPE],
        [ConfigKeys.SCHEDULE]: defaultValues[ConfigKeys.SCHEDULE],
        [ConfigKeys.TAGS]: defaultValues[ConfigKeys.TAGS],
        [ConfigKeys.TIMEOUT]: defaultValues[ConfigKeys.TIMEOUT],
        [ConfigKeys.URLS]: defaultValues[ConfigKeys.URLS],
      }
    : undefined;
  const tlsFields: ITLSFields | undefined = defaultValues
    ? {
        [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]:
          defaultValues[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES],
        [ConfigKeys.TLS_CERTIFICATE]: defaultValues[ConfigKeys.TLS_CERTIFICATE],
        [ConfigKeys.TLS_KEY]: defaultValues[ConfigKeys.TLS_KEY],
        [ConfigKeys.TLS_KEY_PASSPHRASE]: defaultValues[ConfigKeys.TLS_KEY_PASSPHRASE],
        [ConfigKeys.TLS_VERIFICATION_MODE]: defaultValues[ConfigKeys.TLS_VERIFICATION_MODE],
        [ConfigKeys.TLS_VERSION]: defaultValues[ConfigKeys.TLS_VERSION],
      }
    : undefined;
  return (
    <HTTPAdvancedFieldsContextProvider defaultValues={httpAdvancedFields}>
      <HTTPSimpleFieldsContextProvider defaultValues={httpSimpleFields}>
        <TLSFieldsContextProvider defaultValues={tlsFields}>{children}</TLSFieldsContextProvider>
      </HTTPSimpleFieldsContextProvider>
    </HTTPAdvancedFieldsContextProvider>
  );
};
