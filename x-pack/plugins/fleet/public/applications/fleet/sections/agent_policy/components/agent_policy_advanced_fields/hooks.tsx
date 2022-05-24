/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiSpacer } from '@elastic/eui';

import { useGetOutputs, useLicense } from '../../../../hooks';
import {
  LICENCE_FOR_PER_POLICY_OUTPUT,
  FLEET_APM_PACKAGE,
  outputType,
} from '../../../../../../../common';
import type { NewAgentPolicy, AgentPolicy } from '../../../../types';

// The super select component do not support null or '' as a value
export const DEFAULT_OUTPUT_VALUE = '@@##DEFAULT_OUTPUT_VALUE##@@';

function getOutputLabel(name: string, disabledMessage?: React.ReactNode) {
  if (!disabledMessage) {
    return name;
  }

  return (
    <>
      <EuiText size="s">{name}</EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s">{disabledMessage}</EuiText>
    </>
  );
}

function getDefaultOutput(
  defaultOutputName?: string,
  defaultOutputDisabled?: boolean,
  defaultOutputDisabledMessage?: React.ReactNode
) {
  return {
    inputDisplay: getOutputLabel(
      i18n.translate('xpack.fleet.agentPolicy.outputOptions.defaultOutputText', {
        defaultMessage: 'Default (currently {defaultOutputName})',
        values: { defaultOutputName },
      }),
      defaultOutputDisabledMessage
    ),
    value: DEFAULT_OUTPUT_VALUE,
    disabled: defaultOutputDisabled,
  };
}

export function useOutputOptions(agentPolicy: Partial<NewAgentPolicy | AgentPolicy>) {
  const outputsRequest = useGetOutputs();
  const licenseService = useLicense();

  const isLicenceAllowingPolicyPerOutput = licenseService.hasAtLeast(LICENCE_FOR_PER_POLICY_OUTPUT);
  const isAgentPolicyUsingAPM =
    'package_policies' in agentPolicy &&
    agentPolicy.package_policies?.some((packagePolicy) => {
      return typeof packagePolicy !== 'string' && packagePolicy.package?.name === FLEET_APM_PACKAGE;
    });

  const dataOutputOptions = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    const defaultOutput = outputsRequest.data.items.find((item) => item.is_default);
    const defaultOutputName = defaultOutput?.name;
    const defaultOutputDisabled =
      isAgentPolicyUsingAPM && defaultOutput?.type === outputType.Logstash;

    const defaultOutputDisabledMessage = defaultOutputDisabled ? (
      <FormattedMessage
        id="xpack.fleet.agentPolicyForm.outputOptionDisabledAPMAndLogstashText"
        defaultMessage="Logstash output for agent integration is not supported for APM"
      />
    ) : undefined;

    return [
      getDefaultOutput(defaultOutputName, defaultOutputDisabled, defaultOutputDisabledMessage),
      ...outputsRequest.data.items.map((item) => {
        const isLogstashOutputWithAPM = isAgentPolicyUsingAPM && item.type === outputType.Logstash;

        return {
          value: item.id,
          inputDisplay: getOutputLabel(
            item.name,
            isLogstashOutputWithAPM ? (
              <FormattedMessage
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledAPMAndLogstashText"
                defaultMessage="Logstash output for agent integration is not supported for APM"
              />
            ) : undefined
          ),
          disabled: !isLicenceAllowingPolicyPerOutput || isLogstashOutputWithAPM,
        };
      }),
    ];
  }, [outputsRequest, isLicenceAllowingPolicyPerOutput, isAgentPolicyUsingAPM]);

  const monitoringOutputOptions = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    const defaultOutputName = outputsRequest.data.items.find(
      (item) => item.is_default_monitoring
    )?.name;
    return [
      getDefaultOutput(defaultOutputName),
      ...outputsRequest.data.items.map((item) => {
        return {
          value: item.id,
          inputDisplay: item.name,
          disabled: !isLicenceAllowingPolicyPerOutput,
        };
      }),
    ];
  }, [outputsRequest, isLicenceAllowingPolicyPerOutput]);

  return useMemo(
    () => ({
      dataOutputOptions,
      monitoringOutputOptions,
      isLoading: outputsRequest.isLoading,
    }),
    [dataOutputOptions, monitoringOutputOptions, outputsRequest.isLoading]
  );
}
