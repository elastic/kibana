/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  EuiForm,
  EuiRadio,
  EuiSelect,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import {
  ALL_EVENTS,
  CLOUD_SECURITY,
  EDR_COMPLETE,
  NGAV,
  EDR_ESSENTIAL,
  ENDPOINT,
  INTERACTIVE_ONLY,
} from './translations';

const PREFIX = 'endpoint_policy_create_extension';

const ENDPOINT_INTEGRATION_CONFIG_KEY = 'ENDPOINT_INTEGRATION_CONFIG';

const environmentMapping = {
  cloud: CLOUD_SECURITY,
  endpoint: ENDPOINT,
};

const endpointPresetsMapping = {
  NGAV,
  EDREssential: EDR_ESSENTIAL,
  EDRComplete: EDR_COMPLETE,
};

const cloudEventMapping = {
  INTERACTIVE_ONLY,
  ALL_EVENTS,
};

type EndpointPreset = keyof typeof endpointPresetsMapping;
type CloudEvent = keyof typeof cloudEventMapping;
type Environment = keyof typeof environmentMapping;

const environmentOptions: Array<{ value: Environment; text: string }> = [
  { value: 'endpoint', text: ENDPOINT },
  { value: 'cloud', text: CLOUD_SECURITY },
];

const HelpTextWithPadding = styled.div`
  padding-left: ${(props) => props.theme.eui.euiSizeL};
`;

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const EndpointPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    // / Endpoint Radio Options (NGAV and EDRs)
    const [endpointPreset, setEndpointPreset] = useState<EndpointPreset>('NGAV');
    const [selectedCloudEvent, setSelectedCloudEvent] = useState<CloudEvent>('ALL_EVENTS');
    const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>('endpoint');
    const initialRender = useRef(true);

    // Fleet will initialize the create form with a default name for the integrating policy, however,
    // for endpoint security, we want the user to explicitly type in a name, so we blank it out
    // only during 1st component render (thus why the eslint disabled rule below).
    // Default values for config are endpoint + NGAV
    useEffect(() => {
      if (initialRender.current) {
        onChange({
          isValid: false,
          updatedPolicy: {
            ...newPolicy,
            name: '',
            inputs: [
              {
                enabled: true,
                streams: [],
                type: ENDPOINT_INTEGRATION_CONFIG_KEY,
                config: {
                  _config: {
                    value: {
                      type: 'endpoint',
                      endpointConfig: {
                        preset: 'NGAV',
                      },
                    },
                  },
                },
              },
            ],
          },
        });
      }
    }, [onChange, newPolicy]);

    useEffect(() => {
      // Skip triggering this onChange on the initial render
      if (initialRender.current) {
        initialRender.current = false;
      } else {
        onChange({
          isValid: true,
          updatedPolicy: {
            ...newPolicy,
            inputs: [
              {
                ...newPolicy.inputs[0],
                config: {
                  _config: {
                    value: {
                      type: selectedEnvironment,
                      ...(selectedEnvironment === 'cloud'
                        ? {
                            eventFilters: {
                              nonInteractiveSession: selectedCloudEvent === 'INTERACTIVE_ONLY',
                            },
                          }
                        : {
                            endpointConfig: {
                              preset: endpointPreset,
                            },
                          }),
                    },
                  },
                },
              },
            ],
          },
        });
      }
    }, [selectedEnvironment, selectedCloudEvent, endpointPreset, onChange, newPolicy]);

    const onChangeEnvironment = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedEnvironment(e?.target?.value as Environment);
    }, []);
    const onChangeCloudEvent = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedCloudEvent(e.target.value as CloudEvent);
    }, []);
    const onChangeEndpointPreset = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setEndpointPreset(e.target.value as EndpointPreset);
    }, []);

    const getEndpointPresetsProps = useCallback(
      (preset: EndpointPreset) => ({
        id: `${PREFIX}_endpoint_preset_${preset}`,
        label: endpointPresetsMapping[preset],
        value: preset,
        checked: endpointPreset === preset,
        onChange: onChangeEndpointPreset,
      }),
      [endpointPreset, onChangeEndpointPreset]
    );

    const getCloudEventsProps = useCallback(
      (cloudEvent: CloudEvent) => ({
        id: `${PREFIX}_cloud_event_${cloudEvent}`,
        label: cloudEventMapping[cloudEvent],
        value: cloudEvent,
        checked: selectedCloudEvent === cloudEvent,
        onChange: onChangeCloudEvent,
      }),
      [selectedCloudEvent, onChangeCloudEvent]
    );

    return (
      <EuiForm component="form">
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.createPackagePolicy.stepConfigure.enablePrevention"
              defaultMessage="Select configuration settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.createPackagePolicy.stepConfigure.quickSettingsTranslation"
              defaultMessage="Use quick settings to configure the integration to {environments}. You can make configuration changes after you create the integration."
              values={{
                environments: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.environments"
                      defaultMessage="protect your traditional endpoints or dynamic cloud environments"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.securitySolution.createPackagePolicy.stepConfigure.selectEnvironmentTextTranslation"
              defaultMessage="Select the type of environment you want to protect:"
            />
          }
        >
          <EuiSelect
            id="selectIntegrationTypeId"
            options={environmentOptions}
            value={selectedEnvironment}
            onChange={onChangeEnvironment}
            fullWidth={true}
          />
        </EuiFormRow>
        {selectedEnvironment === 'endpoint' ? (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointNGAV"
                    defaultMessage="Prevents Malware, Ransomware and Memory Threats and provides process telemetry"
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getEndpointPresetsProps('NGAV')} />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointEDREssential"
                    defaultMessage="Endpoint Alerts, Process Events, Network Events, File Events"
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getEndpointPresetsProps('EDREssential')} />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointEDRComplete"
                    defaultMessage="Endpoint Alerts, Full Event capture"
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getEndpointPresetsProps('EDRComplete')} />
            </EuiFormRow>
          </>
        ) : (
          <>
            <EuiSpacer size="m" />
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.interactiveSessionSuggestionTranslation"
                  defaultMessage="To reduce data ingestion volume, select Interactive only"
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeComprehensiveInfo"
                    defaultMessage="Monitors and collects session data from all process executions. "
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getCloudEventsProps('ALL_EVENTS')} />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeInteractiveOnlyInfo"
                    defaultMessage="Monitors and collects session data from interactive sessions only. "
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getCloudEventsProps('INTERACTIVE_ONLY')} />
            </EuiFormRow>
          </>
        )}
        <EuiSpacer size="xl" />
      </EuiForm>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.newPolicy.name === nextProps.newPolicy.name;
  }
);
EndpointPolicyCreateExtension.displayName = 'EndpointPolicyCreateExtension';
