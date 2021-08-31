/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { useTrackPageview } from '../../../../observability/public';
import {
  PolicyConfig,
  DataStream,
  ConfigKeys,
  HTTPFields,
  TCPFields,
  ICMPFields,
  BrowserFields,
} from './types';
import {
  useMonitorTypeContext,
  useTCPSimpleFieldsContext,
  useTCPAdvancedFieldsContext,
  useICMPSimpleFieldsContext,
  useHTTPSimpleFieldsContext,
  useHTTPAdvancedFieldsContext,
  useTLSFieldsContext,
  useBrowserSimpleFieldsContext,
  useBrowserAdvancedFieldsContext,
  defaultHTTPAdvancedFields,
  defaultHTTPSimpleFields,
  defaultICMPSimpleFields,
  defaultTCPSimpleFields,
  defaultTCPAdvancedFields,
  defaultBrowserSimpleFields,
  defaultBrowserAdvancedFields,
  defaultTLSFields,
} from './contexts';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';
import { validate } from './validation';

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
  },
};

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const { monitorType } = useMonitorTypeContext();
    const { fields: httpSimpleFields } = useHTTPSimpleFieldsContext();
    const { fields: tcpSimpleFields } = useTCPSimpleFieldsContext();
    const { fields: icmpSimpleFields } = useICMPSimpleFieldsContext();
    const { fields: browserSimpleFields } = useBrowserSimpleFieldsContext();
    const { fields: httpAdvancedFields } = useHTTPAdvancedFieldsContext();
    const { fields: tcpAdvancedFields } = useTCPAdvancedFieldsContext();
    const { fields: browserAdvancedFields } = useBrowserAdvancedFieldsContext();
    const { fields: tlsFields } = useTLSFieldsContext();

    const policyConfig: PolicyConfig = {
      [DataStream.HTTP]: {
        ...httpSimpleFields,
        ...httpAdvancedFields,
        ...tlsFields,
        [ConfigKeys.NAME]: newPolicy.name,
      } as HTTPFields,
      [DataStream.TCP]: {
        ...tcpSimpleFields,
        ...tcpAdvancedFields,
        ...tlsFields,
        [ConfigKeys.NAME]: newPolicy.name,
      } as TCPFields,
      [DataStream.ICMP]: {
        ...icmpSimpleFields,
        [ConfigKeys.NAME]: newPolicy.name,
      } as ICMPFields,
      [DataStream.BROWSER]: {
        ...browserSimpleFields,
        ...browserAdvancedFields,
        [ConfigKeys.NAME]: newPolicy.name,
      } as BrowserFields,
    };

    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate', delay: 15000 });

    const dataStreams: DataStream[] = useMemo(() => {
      return newPolicy.inputs.map((input) => {
        return input.type.replace(/synthetics\//g, '') as DataStream;
      });
    }, [newPolicy]);

    useUpdatePolicy({
      monitorType,
      defaultConfig: defaultConfig[monitorType],
      config: policyConfig[monitorType],
      newPolicy,
      onChange,
      validate,
    });

    // Fleet will initialize the create form with a default name for the integratin policy, however,
    // for synthetics, we want the user to explicitely type in a name to use as the monitor name,
    // so we blank it out only during 1st component render (thus why the eslint disabled rule below).
    useEffect(() => {
      onChange({
        isValid: false,
        updatedPolicy: {
          ...newPolicy,
          name: '',
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <CustomFields typeEditable validate={validate[monitorType]} dataStreams={dataStreams} />;
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';
