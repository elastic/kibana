/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { ConfigKeys, ITCPSimpleFields, ITCPAdvancedFields } from '../types';
import { TCPSimpleFieldsContextProvider, TCPAdvancedFieldsContextProvider } from '.';

interface TCPContextProviderProps {
  defaultValues?: any;
  children: ReactNode;
}

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const TCPContextProvider = ({ defaultValues, children }: TCPContextProviderProps) => {
  const tcpSimpleFields: ITCPSimpleFields | undefined = defaultValues
    ? {
        [ConfigKeys.APM_SERVICE_NAME]: defaultValues[ConfigKeys.APM_SERVICE_NAME],
        [ConfigKeys.HOSTS]: defaultValues[ConfigKeys.HOSTS],
        [ConfigKeys.MONITOR_TYPE]: defaultValues[ConfigKeys.MONITOR_TYPE],
        [ConfigKeys.SCHEDULE]: defaultValues[ConfigKeys.SCHEDULE],
        [ConfigKeys.TAGS]: defaultValues[ConfigKeys.TAGS],
        [ConfigKeys.TIMEOUT]: defaultValues[ConfigKeys.TIMEOUT],
      }
    : undefined;
  const tcpAdvancedFields: ITCPAdvancedFields | undefined = defaultValues
    ? {
        [ConfigKeys.PROXY_URL]: defaultValues[ConfigKeys.PROXY_URL],
        [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: defaultValues[ConfigKeys.PROXY_USE_LOCAL_RESOLVER],
        [ConfigKeys.RESPONSE_RECEIVE_CHECK]: defaultValues[ConfigKeys.RESPONSE_RECEIVE_CHECK],
        [ConfigKeys.REQUEST_SEND_CHECK]: defaultValues[ConfigKeys.REQUEST_SEND_CHECK],
      }
    : undefined;
  return (
    <TCPAdvancedFieldsContextProvider defaultValues={tcpAdvancedFields}>
      <TCPSimpleFieldsContextProvider defaultValues={tcpSimpleFields}>
        {children}
      </TCPSimpleFieldsContextProvider>
    </TCPAdvancedFieldsContextProvider>
  );
};
