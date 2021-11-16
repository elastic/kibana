/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
}

export const SyntheticsCreateProviders = ({ children }: Props) => {
  return (
    <PolicyConfigContextProvider>
      <HTTPContextProvider>
        <TCPContextProvider>
          <TLSFieldsContextProvider>
            <ICMPSimpleFieldsContextProvider>
              <BrowserContextProvider>{children}</BrowserContextProvider>
            </ICMPSimpleFieldsContextProvider>
          </TLSFieldsContextProvider>
        </TCPContextProvider>
      </HTTPContextProvider>
    </PolicyConfigContextProvider>
  );
};
