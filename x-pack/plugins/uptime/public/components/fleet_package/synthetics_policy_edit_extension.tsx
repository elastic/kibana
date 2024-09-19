/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
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
  useBrowserSimpleFieldsContext,
  useBrowserAdvancedFieldsContext,
} from './contexts';
import {
  ICustomFields,
  DataStream,
  HTTPFields,
  TCPFields,
  ICMPFields,
  BrowserFields,
  ConfigKeys,
  PolicyConfig,
} from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';
import { validate } from './validation';

interface SyntheticsPolicyEditExtensionProps {
  newPolicy: PackagePolicyEditExtensionComponentProps['newPolicy'];
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
  defaultConfig: Partial<ICustomFields>;
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
    const { fields: browserSimpleFields } = useBrowserSimpleFieldsContext();
    const { fields: browserAdvancedFields } = useBrowserAdvancedFieldsContext();

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

    useUpdatePolicy({
      defaultConfig,
      config: policyConfig[monitorType],
      newPolicy,
      onChange,
      validate,
      monitorType,
    });

    return <CustomFields isTLSEnabled={isTLSEnabled} validate={validate[monitorType]} />;
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
