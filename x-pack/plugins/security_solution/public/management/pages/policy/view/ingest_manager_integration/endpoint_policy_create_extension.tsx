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

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
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
                  events: {
                    process: true,
                    file: false,
                    network: false,
                    session_data: false,
                  },
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
                  },
                  eventFilters: {
                    interactiveSession: true,
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
                      events: {
                        process: true,
                        file: false,
                        network: false,
                        session_data: false,
                      },
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
                ...newPolicy.inputs[0],
                eventFilters: {
                  interactiveSession: false,
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
                ...newPolicy.inputs[0],
                eventFilters: {
                  interactiveSession: true,
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
                    // type: 'endpoint',
                    ...newPolicy.inputs[0]._config,
                    endpointConfig: {
                      events: {
                        process: true,
                        file: false,
                        network: false,
                        session_data: false,
                      },
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
                    // type: 'endpoint',
                    ...newPolicy.inputs[0]._config,
                    endpointConfig: {
                      events: {
                        process: true,
                        file: true,
                        network: true,
                        session_data: false,
                      },
                    },
                  },
                },
              ],
            },
          });
        } else if (e.target.value === 'EDR Complete') {
          // onChange({isValid:true, updatedPolicy : {inputs : [{ config : { _create : {policyParams : {type: 'endpoint', sessionData: true}}}}]}})
          onChange({
            isValid: true,
            updatedPolicy: {
              inputs: [
                {
                  _config: {
                    ...newPolicy.inputs[0]._config,
                    endpointConfig: {
                      events: {
                        process: true,
                        file: true,
                        network: true,
                        session_data: true,
                      },
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
        <div css={{ fontSize: '18px', fontWeight: 700, paddingTop: '12px', paddingBottom: '10px' }}>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.enablePrevention"
            defaultMessage="Select configuration settings"
          />
        </div>
        <div css={{ paddingBottom: '24px', fontSize: '14px', lineHeight: '24px' }}>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.quickSettingsTranslation"
            defaultMessage="Use quick settings to configure the integration to protect your tranditional endpoints or dynamic clound environments. You can make changes to the configurations after you add it."
          />
        </div>
        <div css={{ paddingBottom: '0px', fontSize: '14px', lineHeight: '24px' }}>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.selectEnvironmentTextTranslation"
            defaultMessage="Select for what environment you would like to add the integration"
          />
        </div>
        <EuiSelect
          id="selectIntegrationTypeId"
          options={dropDownOptions}
          value={dropdownValue}
          onChange={(e) => onChangeDropdown(e)}
          fullWidth={true}
        />

        {dropdownValue === dropDownOptions[0].value && (
          <>
            <EuiRadio
              id="radioOptionNGAV"
              label="NGAV"
              name="Radio Endpoint"
              value="NGAV"
              checked={radioEndpointOption === 'NGAV'}
              onChange={(e) => onChangeRadioEndpoint(e)}
            />
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeEndpointNGAV"
              defaultMessage="Prevents Malware, Ransomware and Memory Threats and provides process telemetry"
            />

            <EuiRadio
              id="radioOptionEDREssential"
              label="EDR Essential"
              name="Radio Endpoint"
              value="EDR Essential"
              checked={radioEndpointOption === 'EDR Essential'}
              onChange={(e) => onChangeRadioEndpoint(e)}
            />
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeEndpointEDREssential"
              defaultMessage="Endpoint Alerts, Process Events, Network Events, File Events"
            />

            <EuiRadio
              id="radioOptionEDRComplete"
              label="EDR Complete"
              name="Radio Endpoint"
              value="EDR Complete"
              checked={radioEndpointOption === 'EDR Complete'}
              onChange={(e) => onChangeRadioEndpoint(e)}
            />
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeEndpointEDRComplete"
              defaultMessage="Endpoint Alerts, Full Event capture"
            />
          </>
        )}

        {dropdownValue === dropDownOptions[1].value && (
          <>
            <div
              css={{
                fontSize: '12px',
                width: 'max-content',
                fontWeight: 400,
                paddingTop: '12px',
                paddingBottom: '10px',
              }}
            >
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.interactiveSessionSuggestionTranslation"
                defaultMessage="To save on data ingestion volume select interactive session only "
              />
            </div>

            <EuiRadio
              id="radioInteractiveOption"
              label="Interactive only"
              checked={radioInteractiveSelected}
              onChange={onChangeRadio}
            />
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeInteractiveOnlyInfo"
              defaultMessage="Monitors and collects session data from interactive sessions only. "
            />

            <EuiRadio
              id="radioComprehensiveOption"
              label="All events"
              checked={radioComprehensiveSelected}
              onChange={onChangeRadio}
            />
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeComprehensiveInfo"
              defaultMessage="Monitors and collects session data from all process executions. "
            />

            <div
              css={{
                fontSize: '14px',
                width: '240px',
                fontWeight: 700,
                paddingTop: '10px',
                paddingBottom: '10px',
              }}
            >
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.protectionModeTranslation"
                defaultMessage="Protection mode"
              />
            </div>
            <div>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.protectionModeDetailsTranslation"
                defaultMessage="In addition to detections, Elastic security can prevent threats before they happen.
              You can disable detections anytime in the agent policy configurations settings."
              />
            </div>
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
          </>
        )}
      </EuiForm>
    );
  }
);
EndpointPolicyCreateExtension.displayName = 'EndpointPolicyCreateExtension';
