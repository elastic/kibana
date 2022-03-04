/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSuperSelectOption } from '@elastic/eui';

import { useGetOutputs, useLicense } from '../../../../hooks';
import { LICENCE_FOR_PER_POLICY_OUTPUT } from '../../../../../../../common';

// The super select component do not support null or '' as a value
export const DEFAULT_OUTPUT_VALUE = '@@##DEFAULT_OUTPUT_VALUE##@@';

function getDefaultOutput(defaultOutputName?: string) {
  return {
    inputDisplay: i18n.translate('xpack.fleet.agentPolicy.outputOptions.defaultOutputText', {
      defaultMessage: 'Default (currently {defaultOutputName})',
      values: { defaultOutputName },
    }),
    value: DEFAULT_OUTPUT_VALUE,
  };
}

export function useOutputOptions() {
  const outputsRequest = useGetOutputs();
  const licenseService = useLicense();

  const isLicenceAllowingPolicyPerOutput = licenseService.hasAtLeast(LICENCE_FOR_PER_POLICY_OUTPUT);

  const outputOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    return outputsRequest.data.items.map((item) => ({
      value: item.id,
      inputDisplay: item.name,
      disabled: !isLicenceAllowingPolicyPerOutput,
    }));
  }, [outputsRequest, isLicenceAllowingPolicyPerOutput]);

  const dataOutputOptions = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    const defaultOutputName = outputsRequest.data.items.find((item) => item.is_default)?.name;
    return [getDefaultOutput(defaultOutputName), ...outputOptions];
  }, [outputsRequest, outputOptions]);

  const monitoringOutputOptions = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    const defaultOutputName = outputsRequest.data.items.find(
      (item) => item.is_default_monitoring
    )?.name;
    return [getDefaultOutput(defaultOutputName), ...outputOptions];
  }, [outputsRequest, outputOptions]);

  return useMemo(
    () => ({
      dataOutputOptions,
      monitoringOutputOptions,
      isLoading: outputsRequest.isLoading,
    }),
    [dataOutputOptions, monitoringOutputOptions, outputsRequest.isLoading]
  );
}
