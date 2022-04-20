/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataStream, PolicyConfig } from '../types';
import { initialValues as defaultHTTPSimpleFields } from './http_context';
import { initialValues as defaultHTTPAdvancedFields } from './http_context_advanced';
import { initialValues as defaultTCPSimpleFields } from './tcp_context';
import { initialValues as defaultICMPSimpleFields } from './icmp_context';
import { initialValues as defaultTCPAdvancedFields } from './tcp_context_advanced';
import { initialValues as defaultBrowserSimpleFields } from './browser_context';
import { initialValues as defaultBrowserAdvancedFields } from './browser_context_advanced';
import { initialValues as defaultTLSFields } from './tls_fields_context';

export type { IPolicyConfigContextProvider } from './policy_config_context';
export {
  PolicyConfigContext,
  PolicyConfigContextProvider,
  initialValue as defaultPolicyConfig,
  defaultContext as defaultPolicyConfigValues,
  usePolicyConfigContext,
} from './policy_config_context';
export {
  HTTPSimpleFieldsContext,
  HTTPSimpleFieldsContextProvider,
  initialValues as defaultHTTPSimpleFields,
  useHTTPSimpleFieldsContext,
} from './http_context';
export {
  HTTPAdvancedFieldsContext,
  HTTPAdvancedFieldsContextProvider,
  initialValues as defaultHTTPAdvancedFields,
  useHTTPAdvancedFieldsContext,
} from './http_context_advanced';
export {
  TCPSimpleFieldsContext,
  TCPSimpleFieldsContextProvider,
  initialValues as defaultTCPSimpleFields,
  useTCPSimpleFieldsContext,
} from './tcp_context';
export {
  ICMPSimpleFieldsContext,
  ICMPSimpleFieldsContextProvider,
  initialValues as defaultICMPSimpleFields,
  useICMPSimpleFieldsContext,
} from './icmp_context';
export {
  TCPAdvancedFieldsContext,
  TCPAdvancedFieldsContextProvider,
  initialValues as defaultTCPAdvancedFields,
  useTCPAdvancedFieldsContext,
} from './tcp_context_advanced';
export {
  BrowserSimpleFieldsContext,
  BrowserSimpleFieldsContextProvider,
  initialValues as defaultBrowserSimpleFields,
  useBrowserSimpleFieldsContext,
} from './browser_context';
export {
  BrowserAdvancedFieldsContext,
  BrowserAdvancedFieldsContextProvider,
  initialValues as defaultBrowserAdvancedFields,
  useBrowserAdvancedFieldsContext,
} from './browser_context_advanced';
export {
  TLSFieldsContext,
  TLSFieldsContextProvider,
  initialValues as defaultTLSFields,
  useTLSFieldsContext,
} from './tls_fields_context';
export { HTTPContextProvider } from './http_provider';
export { TCPContextProvider } from './tcp_provider';
export { BrowserContextProvider } from './browser_provider';
export { SyntheticsProviders } from './synthetics_context_providers';

export const defaultConfig: PolicyConfig = {
  [DataStream.HTTP]: {
    ...defaultHTTPSimpleFields,
    ...defaultHTTPAdvancedFields,
    ...defaultTLSFields,
  },
  [DataStream.TCP]: {
    ...defaultTCPSimpleFields,
    ...defaultTCPAdvancedFields,
    ...defaultTLSFields,
  },
  [DataStream.ICMP]: defaultICMPSimpleFields,
  [DataStream.BROWSER]: {
    ...defaultBrowserSimpleFields,
    ...defaultBrowserAdvancedFields,
    ...defaultTLSFields,
  },
};
