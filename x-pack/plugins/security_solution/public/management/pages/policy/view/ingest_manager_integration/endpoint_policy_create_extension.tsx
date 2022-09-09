/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { EuiForm, EuiFlexGroup, EuiFlexItem, EuiCheckbox, EuiRadio, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import styled from 'styled-components';
import { useLicense } from '../../../../../common/hooks/use_license';

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */

const ENDPOINT_INTEGRATION_CONFIG_KEY = 'ENDPOINT_INTEGRATION_CONFIG';

const NGAV = 'NGAV';
const EDR_ESSENTIAL = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionEDREssential',
  {
    defaultMessage: 'EDR Essential',
  }
);
const EDR_COMPLETE = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionEDRComplete',
  {
    defaultMessage: 'EDR Complete',
  }
);

const ENDPOINT = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOption',
  {
    defaultMessage: 'Endpoint',
  }
);
const CLOUD_SECURITY = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudSecurityDropdownOption',
  {
    defaultMessage: 'Cloud Security',
  }
);
const INTERACTIVE_ONLY = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersInteractiveOnly',
  {
    defaultMessage: 'Interactive only',
  }
);
const ALL_EVENTS = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersAllEvents',
  {
    defaultMessage: 'All events',
  }
);
const PREVENT_MALWARE = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersPreventionMalware',
  {
    defaultMessage: 'Prevent Malware',
  }
);
const PREVENT_MALICIOUS_BEHAVIOUR = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersPreventionMaliciousBehaviour',
  {
    defaultMessage: 'Prevent Malicious Behaviour',
  }
);

const SelectConfigurationSettingsText = styled.div`
  font-size: 22px;
  font-weight: 700;
  padding-top: 12px;
  padding-bottom: 10px;
  line-height: 32px;
`;

const RadioOptionsDetails = styled.div`
  padding-left: 24px;
  color: ${(props) => props.theme.eui.euiColorDarkShade};
  font-weight: 400;
  font-size: 12.25px;
  line-height: 21px;
`;

const IntegrationOptionsContainer = styled.div`
  margin-bottom: 48px;
  margin-top: 17px;
`;

const CloudOptionDataIngestionMessage = styled.div`
  font-size: 14px;
  width: max-content;
  font-weight: 400;
  padding-top: 12px;
  padding-bottom: 10px;
  color: ${(props) => props.theme.eui.euiColorDarkShade};
`;

const SubduedText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${(props) => props.theme.eui.euiColorDarkShade};
  line-height: 24px;
`;

const BoldSubtitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  padding-top: 10px;
  padding-bottom: 8px;
`;

const QuickSettingInfo = styled.div`
  padding-bottom: 16px;
  font-size: 14px;
  line-height: 24px;
`;

const CloudRadioProtectionsModeContainer = styled.div`
  padding-top: 8px;
`;

const PaddingBottomText = styled.div`
  padding-bottom: 14px;
`;

const dropDownOptions = [
  { value: 'endpoint', text: ENDPOINT },
  { value: 'cloud', text: CLOUD_SECURITY },
];

export const EndpointPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    // Fleet will initialize the create form with a default name for the integratin policy, however,
    // for endpoint security, we want the user to explicitely type in a name, so we blank it out
    // only during 1st component render (thus why the eslint disabled rule below).

    const isPlatinumPlus = useLicense().isPlatinumPlus();

    // Run useEffect when page 1st load, default value are endpoint + NGAV

    // / Endpoint Radio Options (NGAV and EDRs)
    const [radioEndpointOption, setRadioEndpointOption] = useState(NGAV);

    const [checkboxMalwareChecked, setCheckboxMalwareChecked] = useState(false);
    const [checkboxMaliciousChecked, setCheckboxMaliciousChecked] = useState(false);

    const [radioInteractiveSelected, setRadioInteractiveSelected] = useState(false);
    const [radioComprehensiveSelected, setRadioComprehensiveSelected] = useState(true);

    const setPreventions = useCallback(
      (statusBehaviour: boolean, statusMalware: boolean) => {
        onChange({
          isValid: true,
          updatedPolicy: {
            inputs: [
              {
                ...newPolicy.inputs[0],
                enabled: true,
                streams: [],
                type: ENDPOINT_INTEGRATION_CONFIG_KEY,
                config: {
                  _config: {
                    value: {
                      ...newPolicy.inputs[0].config._config.value,
                      cloudConfig: {
                        ...newPolicy.inputs[0].config._config.value.cloudConfig,
                        preventions: {
                          ...newPolicy.inputs[0].config._config.value.cloudConfig.preventions,
                          ...(isPlatinumPlus && { behavior_protection: statusBehaviour }),
                          malware: statusMalware,
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        });
      },
      [onChange, newPolicy.inputs, isPlatinumPlus]
    );

    const setPreset = useCallback(
      (presetValue: string) => {
        onChange({
          isValid: true,
          updatedPolicy: {
            inputs: [
              {
                enabled: true,
                streams: [],
                type: ENDPOINT_INTEGRATION_CONFIG_KEY,
                config: {
                  _config: {
                    value: {
                      ...newPolicy.inputs[0].config._config.value,
                      endpointConfig: {
                        preset: presetValue,
                      },
                    },
                  },
                },
              },
            ],
          },
        });
      },
      [onChange, newPolicy.inputs]
    );

    const setInteractive = useCallback(
      (interactiveStatus: boolean) => {
        onChange({
          isValid: true,
          updatedPolicy: {
            inputs: [
              {
                enabled: true,
                streams: [],
                type: ENDPOINT_INTEGRATION_CONFIG_KEY,
                config: {
                  _config: {
                    value: {
                      ...newPolicy.inputs[0].config._config.value,
                      eventFilters: {
                        nonInteractiveSession: interactiveStatus,
                      },
                    },
                  },
                },
              },
            ],
          },
        });
      },
      [onChange, newPolicy.inputs]
    );

    useEffect(() => {
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [dropdownValue, setDropdownValue] = useState(dropDownOptions[0].value);

    const onChangeDropdown = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDropdownValue(e?.target?.value);
        if (e?.target?.value === 'cloud') {
          onChange({
            isValid: true,
            updatedPolicy: {
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: ENDPOINT_INTEGRATION_CONFIG_KEY,
                  config: {
                    _config: {
                      value: {
                        type: e?.target?.value,
                        cloudConfig: {
                          preventions: {
                            ...(isPlatinumPlus && {
                              behavior_protection: checkboxMaliciousChecked,
                            }),
                            malware: checkboxMalwareChecked,
                          },
                        },
                        eventFilters: {
                          nonInteractiveSession: radioComprehensiveSelected,
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
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: ENDPOINT_INTEGRATION_CONFIG_KEY,
                  config: {
                    _config: {
                      value: {
                        type: e?.target?.value,
                        endpointConfig: {
                          preset: radioEndpointOption,
                        },
                      },
                    },
                  },
                },
              ],
            },
          });
        }
      },
      [
        onChange,
        radioEndpointOption,
        checkboxMaliciousChecked,
        checkboxMalwareChecked,
        isPlatinumPlus,
        radioComprehensiveSelected,
      ]
    );

    const onChangeRadio = useCallback(() => {
      setRadioInteractiveSelected(!radioInteractiveSelected);
      setRadioComprehensiveSelected(!radioComprehensiveSelected);
      setInteractive(!radioComprehensiveSelected);
    }, [radioInteractiveSelected, radioComprehensiveSelected, setInteractive]);

    const onChangeRadioEndpoint = useCallback(
      (e) => {
        setRadioEndpointOption(e.target.value);
        setPreset(e.target.value);
      },
      [setPreset]
    );
    ///

    const onChangeMalwareCheckbox = useCallback(() => {
      setCheckboxMalwareChecked(!checkboxMalwareChecked);
      setPreventions(checkboxMaliciousChecked, !checkboxMalwareChecked);
    }, [checkboxMalwareChecked, checkboxMaliciousChecked, setPreventions]);

    const onChangeRansomwareCheckbox = useCallback(() => {
      setCheckboxMaliciousChecked(!checkboxMaliciousChecked);
      setPreventions(!checkboxMaliciousChecked, checkboxMalwareChecked);
    }, [checkboxMalwareChecked, checkboxMaliciousChecked, setPreventions]);

    return (
      <EuiForm component="form">
        <SelectConfigurationSettingsText>
          <FormattedMessage
            id="xpack.securitySolution.createPackagePolicy.stepConfigure.enablePrevention"
            defaultMessage="Select configuration settings"
          />
        </SelectConfigurationSettingsText>
        <QuickSettingInfo>
          <FormattedMessage
            id="xpack.securitySolution.createPackagePolicy.stepConfigure.quickSettingsTranslation"
            defaultMessage="Use quick settings to configure the integration to {environments}. You can make changes to the configurations after you add it."
            values={{
              environments: (
                <b>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.environments"
                    defaultMessage="protect your tranditional endpoints or dynamic clound environments"
                  />
                </b>
              ),
            }}
          />
        </QuickSettingInfo>
        <PaddingBottomText>
          <FormattedMessage
            id="xpack.securitySolution.createPackagePolicy.stepConfigure.selectEnvironmentTextTranslation"
            defaultMessage="Select for what environment you would like to add the integration"
          />
        </PaddingBottomText>
        <EuiSelect
          id="selectIntegrationTypeId"
          options={dropDownOptions}
          value={dropdownValue}
          onChange={(e) => onChangeDropdown(e)}
          fullWidth={true}
        />

        {dropdownValue === dropDownOptions[0].value && (
          <>
            <IntegrationOptionsContainer>
              <EuiRadio
                id="radioOptionNGAV"
                label="NGAV"
                name="Radio Endpoint"
                value="NGAV"
                checked={radioEndpointOption === 'NGAV'}
                onChange={(e) => onChangeRadioEndpoint(e)}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicTypeEndpointNGAV"
                  defaultMessage="Prevents Malware, Ransomware and Memory Threats and provides process telemetry"
                />
              </RadioOptionsDetails>

              <EuiRadio
                id="radioOptionEDREssential"
                label={EDR_ESSENTIAL}
                name="Radio Endpoint"
                value="EDREssential"
                checked={radioEndpointOption === 'EDREssential'}
                onChange={(e) => onChangeRadioEndpoint(e)}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicTypeEndpointEDREssential"
                  defaultMessage="Endpoint Alerts, Process Events, Network Events, File Events"
                />
              </RadioOptionsDetails>

              <EuiRadio
                id="radioOptionEDRComplete"
                label={EDR_COMPLETE}
                name="Radio Endpoint"
                value="EDRComplete"
                checked={radioEndpointOption === 'EDRComplete'}
                onChange={(e) => onChangeRadioEndpoint(e)}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicTypeEndpointEDRComplete"
                  defaultMessage="Endpoint Alerts, Full Event capture"
                />
              </RadioOptionsDetails>
            </IntegrationOptionsContainer>
          </>
        )}

        {dropdownValue === dropDownOptions[1].value && (
          <>
            <IntegrationOptionsContainer>
              <CloudOptionDataIngestionMessage>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.interactiveSessionSuggestionTranslation"
                  defaultMessage="To save on data ingestion volume select interactive session only "
                />
              </CloudOptionDataIngestionMessage>

              <EuiRadio
                id="radioInteractiveOption"
                label={INTERACTIVE_ONLY}
                checked={radioInteractiveSelected}
                onChange={onChangeRadio}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicTypeInteractiveOnlyInfo"
                  defaultMessage="Monitors and collects session data from interactive sessions only. "
                />
              </RadioOptionsDetails>

              <EuiRadio
                id="radioComprehensiveOption"
                label={ALL_EVENTS}
                checked={radioComprehensiveSelected}
                onChange={onChangeRadio}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicTypeComprehensiveInfo"
                  defaultMessage="Monitors and collects session data from all process executions. "
                />
              </RadioOptionsDetails>

              <BoldSubtitle>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.protectionModeTranslation"
                  defaultMessage="Protection mode"
                />
              </BoldSubtitle>
              <SubduedText>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.protectionModeDetailsTranslation"
                  defaultMessage="In addition to detections, Elastic security can prevent threats before they happen.
              You can disable detections anytime in the agent policy configurations settings."
                />
              </SubduedText>
              <CloudRadioProtectionsModeContainer>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiCheckbox
                      id="CheckBoxIdMalware"
                      label={PREVENT_MALWARE}
                      checked={checkboxMalwareChecked}
                      onChange={onChangeMalwareCheckbox}
                    />
                  </EuiFlexItem>
                  {isPlatinumPlus && (
                    <EuiFlexItem>
                      <EuiCheckbox
                        id="CheckBoxIdmaliciousbehaviour"
                        label={PREVENT_MALICIOUS_BEHAVIOUR}
                        checked={checkboxMaliciousChecked}
                        onChange={onChangeRansomwareCheckbox}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </CloudRadioProtectionsModeContainer>
            </IntegrationOptionsContainer>
          </>
        )}
      </EuiForm>
    );
  }
);
EndpointPolicyCreateExtension.displayName = 'EndpointPolicyCreateExtension';
