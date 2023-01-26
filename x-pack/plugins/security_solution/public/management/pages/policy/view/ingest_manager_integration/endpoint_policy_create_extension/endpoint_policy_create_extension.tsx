/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  EuiForm,
  EuiRadio,
  EuiSelect,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiFormRow,
  EuiCallOut,
  EuiLink,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { useLicense } from '../../../../../../common/hooks/use_license';
import {
  ALL_EVENTS,
  CLOUD_SECURITY,
  EDR_COMPLETE,
  NGAV,
  EDR_ESSENTIAL,
  ENDPOINT,
  INTERACTIVE_ONLY,
  NGAV_NOTE,
  EDR_NOTE,
  DATA_COLLECTION,
} from './translations';

const PREFIX = 'endpoint_policy_create_extension';

const ENDPOINT_INTEGRATION_CONFIG_KEY = 'ENDPOINT_INTEGRATION_CONFIG';

const environmentMapping = {
  cloud: CLOUD_SECURITY,
  endpoint: ENDPOINT,
};

const endpointPresetsMapping = {
  NGAV: {
    label: NGAV,
    note: NGAV_NOTE,
  },
  EDREssential: {
    label: EDR_ESSENTIAL,
    note: EDR_NOTE,
  },
  EDRComplete: {
    label: EDR_COMPLETE,
    note: EDR_NOTE,
  },
  DataCollection: {
    label: DATA_COLLECTION,
    note: null,
  },
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
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isEnterprise = useLicense().isEnterprise();

    // / Endpoint Radio Options (NGAV and EDRs)
    const [endpointPreset, setEndpointPreset] = useState<EndpointPreset>('NGAV');
    const [selectedCloudEvent, setSelectedCloudEvent] = useState<CloudEvent>('INTERACTIVE_ONLY');
    const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>('endpoint');

    // Show NGAV license note when Gold and below
    // Show other licenses note when Platinum and Below
    const showNote =
      (endpointPreset === 'NGAV' && !isPlatinumPlus) ||
      (['EDREssential', 'EDRComplete'].includes(endpointPreset) && !isEnterprise);

    // Fleet will initialize the create form with a default name for the integrating policy, however,
    // for endpoint security, we want the user to explicitly type in a name, so we blank it out
    // only during 1st component render (thus why the eslint disabled rule below).
    // Default values for config are endpoint + NGAV
    useEffect(() => {
      if (newPolicy.inputs.length === 0) {
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
        label: endpointPresetsMapping[preset].label,
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
            data-test-subj="selectIntegrationTypeId"
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
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointDataCollection"
                    defaultMessage="Augment your existing anti-virus solution with advanced data collection and detection"
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getEndpointPresetsProps('DataCollection')} />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointNGAV"
                    defaultMessage="Machine learning malware, ransomware, memory threat, malicious behavior, and credential theft preventions, plus process telemetry"
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
                    defaultMessage="Everything in NGAV, plus file and network telemetry"
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
                    defaultMessage="Everything in Essential EDR, plus full telemetry"
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getEndpointPresetsProps('EDRComplete')} />
            </EuiFormRow>
            {showNote && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut iconType="iInCircle">
                  <EuiText size="s" data-test-subj="create-ensdpoint-policy-license-note">
                    <p>
                      {endpointPresetsMapping[endpointPreset].note}{' '}
                      <FormattedMessage
                        id="xpack.securitySolution.createPackagePolicy.stepConfigure.seeDocumentation"
                        defaultMessage="See {documentation} for more information."
                        values={{
                          documentation: (
                            <EuiLink
                              href="https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html"
                              target="_blank"
                            >
                              <FormattedMessage
                                id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.seeDocumentationLink"
                                defaultMessage="documentation"
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                </EuiCallOut>
              </>
            )}
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
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeAllEventsInfo"
                    defaultMessage="Monitors and collects data from all system executions, including those launched by daemon processes, such as {nginx}, {postgres} and {cron}. {recommendation}"
                    values={{
                      nginx: <EuiCode>{'nginx'}</EuiCode>,
                      postgres: <EuiCode>{'postgres'}</EuiCode>,
                      cron: <EuiCode>{'cron'}</EuiCode>,
                      recommendation: (
                        <em>
                          <strong>
                            <FormattedMessage
                              id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeAllEventsInfoRecommendation"
                              defaultMessage="Recommended for Cloud Workload Protection, auditing and forensics use cases."
                            />
                          </strong>
                        </em>
                      ),
                    }}
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
                    defaultMessage="Captures live system interactions initiated by users through programs like {ssh} or {telnet}. {recommendation}"
                    values={{
                      ssh: <EuiCode>{'ssh'}</EuiCode>,
                      telnet: <EuiCode>{'telnet'}</EuiCode>,
                      recommendation: (
                        <em>
                          <strong>
                            <FormattedMessage
                              id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeInteractiveOnlyInfoRecommendation"
                              defaultMessage="Recommended for auditing and forensic use cases."
                            />
                          </strong>
                        </em>
                      ),
                    }}
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
