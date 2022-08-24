/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { EuiForm, EuiFlexGroup, EuiFlexItem, EuiCheckbox, EuiRadio, EuiSelect } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import styled from 'styled-components';

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
const SelectConfigurationSettingsText = styled.div`
  font-size: 22px;
  font-weight: 700;
  padding-top: 12px;
  padding-bottom: 10px;
  line-height: 32px;
`;

const RadioOptionsDetails = styled.div`
  padding-left: 24px;
  color: #69707d;
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
  color: #69707d;
`;

const SubduedText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: #69707d;
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

const DropDownSelect = styled(EuiSelect)`
  margin-top: 14px;
`;

export const EndpointPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    // Fleet will initialize the create form with a default name for the integratin policy, however,
    // for endpoint security, we want the user to explicitely type in a name, so we blank it out
    // only during 1st component render (thus why the eslint disabled rule below).

    // Run useEffect when page 1st load, default value are endpoint + NGAV
    useEffect(() => {
      onChange({
        isValid: false,
        updatedPolicy: {
          ...newPolicy,
          name: '',
          inputs: [
            {
              _config: {
                type: 'endpoint',
                endpointConfig: {
                  preset: 'NGAV',
                },
              },
            },
          ],
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dropDownOptions = [
      { value: 'endpoint', text: 'Endpoint' },
      { value: 'cloud', text: 'Cloud security' },
    ];
    const [dropdownValue, setDropdownValue] = useState(dropDownOptions[0].value);

    const onChangeDropdown = useCallback(
      (e: string) => {
        setDropdownValue(e?.target?.value);
        if (e?.target?.value === 'cloud') {
          onChange({
            isValid: true,
            updatedPolicy: {
              inputs: [
                {
                  _config: {
                    type: e?.target?.value,
                    cloudConfig: {
                      preventions: {
                        ransomware: false,
                        malware: false,
                      },
                    },
                    eventFilters: {
                      interactiveSession: true,
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
                  _config: {
                    type: e?.target?.value,
                    endpointConfig: {
                      preset: 'NGAV',
                    },
                  },
                },
              ],
            },
          });
        }
      },
      [onChange]
    );

    const [radioInteractiveSelected, setRadioInteractiveSelected] = useState(true);
    const [radioComprehensiveSelected, setRadioComprehensiveSelected] = useState(false);

    const onChangeRadio = useCallback(() => {
      setRadioInteractiveSelected(!radioInteractiveSelected);
      setRadioComprehensiveSelected(!radioComprehensiveSelected);
      if (radioInteractiveSelected === true) {
        onChange({
          isValid: true,
          updatedPolicy: {
            inputs: [
              {
                _config: {
                  ...newPolicy.inputs[0]._config,
                  eventFilters: {
                    interactiveSession: false,
                  },
                },
              },
            ],
          },
        });
      } else if (radioInteractiveSelected === false) {
        onChange({
          isValid: true,
          updatedPolicy: {
            inputs: [
              {
                _config: {
                  ...newPolicy.inputs[0]._config,
                  eventFilters: {
                    interactiveSession: true,
                  },
                },
              },
            ],
          },
        });
      }
    }, [onChange, newPolicy, radioInteractiveSelected, radioComprehensiveSelected]);

    // / Endpoint Radio Options (NGAV and EDRs)
    const [radioEndpointOption, setRadioEndpointOption] = useState('NGAV');

    const onChangeRadioEndpoint = useCallback(
      (e) => {
        setRadioEndpointOption(e.target.value);
        if (e.target.value === 'NGAV') {
          onChange({
            isValid: true,
            updatedPolicy: {
              inputs: [
                {
                  _config: {
                    ...newPolicy.inputs[0]._config,
                    endpointConfig: {
                      preset: 'NGAV',
                    },
                  },
                },
              ],
            },
          });
        } else if (e.target.value === 'EDR Essential') {
          onChange({
            isValid: true,
            updatedPolicy: {
              inputs: [
                {
                  _config: {
                    ...newPolicy.inputs[0]._config,
                    endpointConfig: {
                      preset: 'EDREssential',
                    },
                  },
                },
              ],
            },
          });
        } else if (e.target.value === 'EDR Complete') {
          onChange({
            isValid: true,
            updatedPolicy: {
              inputs: [
                {
                  _config: {
                    ...newPolicy.inputs[0]._config,
                    endpointConfig: {
                      preset: 'EDRComplete',
                    },
                  },
                },
              ],
            },
          });
        }
      },
      [onChange, newPolicy]
    );
    ///

    const [checkboxMalwareChecked, setCheckboxMalwareChecked] = useState(false);
    const [checkboxRansomwareChecked, setCheckboxRansomwareChecked] = useState(false);

    const onChangeMalwareCheckbox = useCallback(() => {
      setCheckboxMalwareChecked(!checkboxMalwareChecked);

      onChange({
        isValid: true,
        updatedPolicy: {
          inputs: [
            {
              ...newPolicy.inputs[0],
              _config: {
                ...newPolicy.inputs[0]._config,
                cloudConfig: {
                  ...newPolicy.inputs[0]._config.cloudConfig,
                  preventions: {
                    ...newPolicy.inputs[0]._config.cloudConfig.preventions,
                    malware: !checkboxMalwareChecked,
                  },
                },
              },
            },
          ],
        },
      });
    }, [checkboxMalwareChecked, newPolicy, onChange]);

    const onChangeRansomwareCheckbox = useCallback(() => {
      setCheckboxRansomwareChecked(!checkboxRansomwareChecked);

      onChange({
        isValid: true,
        updatedPolicy: {
          inputs: [
            {
              ...newPolicy.inputs[0],
              _config: {
                ...newPolicy.inputs[0]._config,
                cloudConfig: {
                  ...newPolicy.inputs[0]._config.cloudConfig,
                  preventions: {
                    ...newPolicy.inputs[0]._config.cloudConfig.preventions,
                    ransomware: !checkboxRansomwareChecked,
                  },
                },
              },
            },
          ],
        },
      });
    }, [checkboxRansomwareChecked, newPolicy, onChange]);

    return (
      <EuiForm component="form">
        <SelectConfigurationSettingsText>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.enablePrevention"
            defaultMessage="Select configuration settings"
          />
        </SelectConfigurationSettingsText>
        <QuickSettingInfo>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.quickSettingsTranslation"
            defaultMessage="Use quick settings to configure the integration to {value}. You can make changes to the configurations after you add it."
            values={{
              value: <b>protect your tranditional endpoints or dynamic clound environments</b>,
            }}
          />
        </QuickSettingInfo>
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.stepConfigure.selectEnvironmentTextTranslation"
          defaultMessage="Select for what environment you would like to add the integration"
        />
        <DropDownSelect
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
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeEndpointNGAV"
                  defaultMessage="Prevents Malware, Ransomware and Memory Threats and provides process telemetry"
                />
              </RadioOptionsDetails>

              <EuiRadio
                id="radioOptionEDREssential"
                label="EDR Essential"
                name="Radio Endpoint"
                value="EDR Essential"
                checked={radioEndpointOption === 'EDR Essential'}
                onChange={(e) => onChangeRadioEndpoint(e)}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeEndpointEDREssential"
                  defaultMessage="Endpoint Alerts, Process Events, Network Events, File Events"
                />
              </RadioOptionsDetails>

              <EuiRadio
                id="radioOptionEDRComplete"
                label="EDR Complete"
                name="Radio Endpoint"
                value="EDR Complete"
                checked={radioEndpointOption === 'EDR Complete'}
                onChange={(e) => onChangeRadioEndpoint(e)}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeEndpointEDRComplete"
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
                  id="xpack.fleet.createPackagePolicy.stepConfigure.interactiveSessionSuggestionTranslation"
                  defaultMessage="To save on data ingestion volume select interactive session only "
                />
              </CloudOptionDataIngestionMessage>

              <EuiRadio
                id="radioInteractiveOption"
                label="Interactive only"
                checked={radioInteractiveSelected}
                onChange={onChangeRadio}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeInteractiveOnlyInfo"
                  defaultMessage="Monitors and collects session data from interactive sessions only. "
                />
              </RadioOptionsDetails>

              <EuiRadio
                id="radioComprehensiveOption"
                label="All events"
                checked={radioComprehensiveSelected}
                onChange={onChangeRadio}
              />
              <RadioOptionsDetails>
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeComprehensiveInfo"
                  defaultMessage="Monitors and collects session data from all process executions. "
                />
              </RadioOptionsDetails>

              <BoldSubtitle>
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.protectionModeTranslation"
                  defaultMessage="Protection mode"
                />
              </BoldSubtitle>
              <SubduedText>
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.protectionModeDetailsTranslation"
                  defaultMessage="In addition to detections, Elastic security can prevent threats before they happen.
              You can disable detections anytime in the agent policy configurations settings."
                />
              </SubduedText>
              <CloudRadioProtectionsModeContainer>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiCheckbox
                      id="CheckBoxIdMalware"
                      label="Prevent malware"
                      checked={checkboxMalwareChecked}
                      onChange={onChangeMalwareCheckbox}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiCheckbox
                      id="CheckBoxIdRansomware"
                      label="Prevent ransomware"
                      checked={checkboxRansomwareChecked}
                      onChange={onChangeRansomwareCheckbox}
                    />
                  </EuiFlexItem>
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
