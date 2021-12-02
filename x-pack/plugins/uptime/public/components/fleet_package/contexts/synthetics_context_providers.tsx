/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HTTPFields, TCPFields, ICMPFields, BrowserFields, TLSFields, DataStream } from '../types';
import {
  PolicyConfigContextProvider,
  TCPContextProvider,
  ICMPSimpleFieldsContextProvider,
  HTTPContextProvider,
  BrowserContextProvider,
  TLSFieldsContextProvider,
} from '.';

interface Props {
  children: React.ReactNode;
  httpDefaultValues?: HTTPFields;
  tcpDefaultValues?: TCPFields;
  icmpDefaultValues?: ICMPFields;
  browserDefaultValues?: BrowserFields;
  tlsDefaultValues?: TLSFields;
  policyDefaultValues?: {
    defaultMonitorType: DataStream;
    defaultIsTLSEnabled: boolean;
    defaultIsZipUrlTLSEnabled: boolean;
    defaultName?: string;
    defaultLocations?: string[];
    isEditable: boolean;
  };
}

export const SyntheticsProviders = ({
  children,
  httpDefaultValues,
  tcpDefaultValues,
  icmpDefaultValues,
  browserDefaultValues,
  tlsDefaultValues,
  policyDefaultValues,
}: Props) => {
  return (
    <PolicyConfigContextProvider {...(policyDefaultValues || {})}>
      <HTTPContextProvider defaultValues={httpDefaultValues}>
        <TCPContextProvider defaultValues={tcpDefaultValues}>
          <TLSFieldsContextProvider defaultValues={tlsDefaultValues}>
            <ICMPSimpleFieldsContextProvider defaultValues={icmpDefaultValues}>
              <BrowserContextProvider defaultValues={browserDefaultValues}>
                {children}
              </BrowserContextProvider>
            </ICMPSimpleFieldsContextProvider>
          </TLSFieldsContextProvider>
        </TCPContextProvider>
      </HTTPContextProvider>
    </PolicyConfigContextProvider>
  );
};
