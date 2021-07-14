/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { useTrackPageview } from '../../../../observability/public';
import { PolicyConfig, DataStream } from './types';
import {
  MonitorTypeContext,
  HTTPAdvancedFieldsContext,
  TCPAdvancedFieldsContext,
  TLSFieldsContext,
  HTTPSimpleFieldsContext,
  TCPSimpleFieldsContext,
  ICMPSimpleFieldsContext,
  defaultHTTPAdvancedFields,
  defaultHTTPSimpleFields,
  defaultICMPSimpleFields,
  defaultTCPSimpleFields,
  defaultTCPAdvancedFields,
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
};

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const { monitorType } = useContext(MonitorTypeContext);
    const { fields: httpSimpleFields } = useContext(HTTPSimpleFieldsContext);
    const { fields: tcpSimpleFields } = useContext(TCPSimpleFieldsContext);
    const { fields: icmpSimpleFields } = useContext(ICMPSimpleFieldsContext);
    const { fields: httpAdvancedFields } = useContext(HTTPAdvancedFieldsContext);
    const { fields: tcpAdvancedFields } = useContext(TCPAdvancedFieldsContext);
    const { fields: tlsFields } = useContext(TLSFieldsContext);
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate', delay: 15000 });
    const { setConfig } = useUpdatePolicy({
      monitorType,
      defaultConfig,
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

    useDebounce(
      () => {
        setConfig(() => {
          switch (monitorType) {
            case DataStream.HTTP:
              return {
                ...httpSimpleFields,
                ...httpAdvancedFields,
                ...tlsFields,
              };
            case DataStream.TCP:
              return {
                ...tcpSimpleFields,
                ...tcpAdvancedFields,
                ...tlsFields,
              };
            case DataStream.ICMP:
              return {
                ...icmpSimpleFields,
              };
          }
        });
      },
      250,
      [
        setConfig,
        httpSimpleFields,
        tcpSimpleFields,
        icmpSimpleFields,
        httpAdvancedFields,
        tcpAdvancedFields,
        tlsFields,
      ]
    );

    return <CustomFields typeEditable validate={validate[monitorType]} />;
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';
