/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { DataStream } from './types';
import { PolicyConfig } from './types';
import {
  usePolicyConfigContext,
  defaultHTTPSimpleFields,
  defaultHTTPAdvancedFields,
  defaultTCPSimpleFields,
  defaultTCPAdvancedFields,
  defaultICMPSimpleFields,
  defaultBrowserSimpleFields,
  defaultBrowserAdvancedFields,
  defaultTLSFields,
} from './contexts';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './hooks/use_update_policy';
import { usePolicy } from './hooks/use_policy';
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
    ...defaultTLSFields,
  },
};

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate', delay: 15000 });

    const { monitorType } = usePolicyConfigContext();
    const policyConfig: PolicyConfig = usePolicy(newPolicy.name);

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

    return <CustomFields validate={validate[monitorType]} dataStreams={dataStreams} />;
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';
