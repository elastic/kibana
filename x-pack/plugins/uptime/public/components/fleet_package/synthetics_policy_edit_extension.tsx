/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import { useTrackPageview } from '../../../../observability/public';
import {
  useMonitorTypeContext,
  useTCPSimpleFieldsContext,
  useTCPAdvancedFieldsContext,
  useICMPSimpleFieldsContext,
  useHTTPSimpleFieldsContext,
  useHTTPAdvancedFieldsContext,
  useTLSFieldsContext,
} from './contexts';
import { PolicyConfig, DataStream } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';
import { validate } from './validation';

interface SyntheticsPolicyEditExtensionProps {
  newPolicy: PackagePolicyEditExtensionComponentProps['newPolicy'];
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
  defaultConfig: PolicyConfig;
  isTLSEnabled: boolean;
}
/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<SyntheticsPolicyEditExtensionProps>(
  ({ newPolicy, onChange, defaultConfig, isTLSEnabled }) => {
    useTrackPageview({ app: 'fleet', path: 'syntheticsEdit' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsEdit', delay: 15000 });
    const { monitorType } = useMonitorTypeContext();
    const { fields: httpSimpleFields } = useHTTPSimpleFieldsContext();
    const { fields: tcpSimpleFields } = useTCPSimpleFieldsContext();
    const { fields: icmpSimpleFields } = useICMPSimpleFieldsContext();
    const { fields: httpAdvancedFields } = useHTTPAdvancedFieldsContext();
    const { fields: tcpAdvancedFields } = useTCPAdvancedFieldsContext();
    const { fields: tlsFields } = useTLSFieldsContext();
    const { setConfig } = useUpdatePolicy({
      defaultConfig,
      newPolicy,
      onChange,
      validate,
      monitorType,
    });

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
        httpAdvancedFields,
        tcpSimpleFields,
        tcpAdvancedFields,
        icmpSimpleFields,
        tlsFields,
      ]
    );

    return <CustomFields isTLSEnabled={isTLSEnabled} validate={validate[monitorType]} />;
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
