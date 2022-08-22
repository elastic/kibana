/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import {  EuiForm, EuiFlexGroup, EuiFlexItem, EuiCheckbox, EuiRadio, EuiSelect } from '@elastic/eui';
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
    
    const dropDownOptions = [
      {value: "Endpoint", text: "Endpoint"},
      {value: "CloudSecurity", text: "Cloud security"}
    ]
    const [dropdownValue, setDropdownValue] = useState(dropDownOptions[0].value);
    const onChangeDropdown = (e : string) => {
      setDropdownValue(e?.target?.value);
    }

    const [radioInteractiveSelected, setRadioInteractiveSelected] = useState(true);
    const [radioComprehensiveSelected, setRadioComprehensiveSelected] = useState(false);
    

    const onChangeRadio = () => {
        setRadioInteractiveSelected(!radioInteractiveSelected);
        setRadioComprehensiveSelected(!radioComprehensiveSelected);
    }
/// Endpoint Radio Options (NGAV and EDRs)
    const [radioEndpointOption, setRadioEndpointOption] = useState('NGAV')

    const onChangeRadioEndpoint = useCallback ((e) => {
      setRadioEndpointOption(e.target.value)
      if(e.target.value === 'NGAV'){
 //      onChange({isValid:true, updatedPolicy : {...newPolicy, inputs: newPolicy.inputs.concat([{ config : { _create : {policyParams : {value_test: 'NGAV', sessionData: false}}}}])}})
 onChange({isValid:true, updatedPolicy : {...newPolicy}})
      }
      else if(e.target.value === 'EDR Essential'){
 //       onChange({isValid:true, updatedPolicy : {...newPolicy, inputs : [{ config : { _create : {policyParams : {value_test: 'EDR Essential', sessionData: false}}}}]}})
 onChange({isValid:true, updatedPolicy : {...newPolicy}})
      }
      else if(e.target.value === 'EDR Complete'){
        onChange({isValid:true, updatedPolicy : {...newPolicy, inputs : [{ config : { _create : {policyParams : {value_test: 'EDR Complete', sessionData: true}}}}]}})
      }
    },[])
///

    const [checkboxMalwareChecked, setCheckboxMalwareChecked] = useState(true);
    const [checkboxRansomwareChecked, setCheckboxRansomwareChecked] = useState(true);

    const onChangeMalwareCheckbox = useCallback( () => {
        setCheckboxMalwareChecked(!checkboxMalwareChecked)
        onChange({isValid:'VALID', updatedPolicy : {packagePolicyOnboardingParam : {sessionData: true, protections:{ransomware:!checkboxRansomwareChecked,malware:!checkboxMalwareChecked}}}})
    },[checkboxMalwareChecked, newPolicy] )

    const onChangeRansomwareCheckbox =  useCallback(() => {
        setCheckboxRansomwareChecked(!checkboxRansomwareChecked)
        onChange({isValid:'VALID', updatedPolicy : {packagePolicyOnboardingParam : {sessionData: true, protections:{ransomware:!checkboxRansomwareChecked,malware:!checkboxMalwareChecked}}}})
    },[checkboxRansomwareChecked, newPolicy] )

    return (
      <EuiForm component="form">
      <div css={{paddingBottom:'24px', fontSize:'14px', lineHeight:'24px'}}>Use quick settings to configure the integration to protect your tranditional endpoints or dynamic clound environments. You can make changes to the configurations after you add it.</div>
      <EuiSelect
        id="selectIntegrationTypeId"
        options={dropDownOptions}
        value={dropdownValue}
        onChange={(e)=>onChangeDropdown(e)}
        fullWidth={true}
     />

      {dropdownValue === dropDownOptions[0].value && (
      <>
          <div css={{fontSize:'16px', fontWeight:700, paddingTop:'12px', paddingBottom:'10px'}}>Enable prevention</div>
          <div css={{fontSize:'12px', fontWeight:400, paddingBottom:'8px'}}>In addition to detections, Elastic security can prevent threat before they happen. You can disable detections later in the agent policy configurations settings.</div>

          <EuiRadio
              id="radioOptionNGAV"
              label="NGAV"
              name="Radio Endpoint"
              value="NGAV"
              checked={radioEndpointOption === "NGAV"}
              onChange={(e)=>onChangeRadioEndpoint(e)}
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
              checked={radioEndpointOption === "EDR Essential"}
              onChange={(e)=>onChangeRadioEndpoint(e)}
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
              checked={radioEndpointOption === "EDR Complete"}
              onChange={(e)=>onChangeRadioEndpoint(e)}
          />
                        <FormattedMessage
                        id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicTypeEndpointEDRComplete"
                        defaultMessage="Endpoint Alerts, Full Event capture"
                      />
      </>
      )}

      {dropdownValue === dropDownOptions[1].value && (
      <>
          <div css={{fontSize:'16px', width:'240px', fontWeight:700, paddingTop:'12px', paddingBottom:'10px'}}>Monitoring mode</div>
          
          
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
          
          
          <div css={{fontSize:'14px', width:'240px', fontWeight:700, paddingTop:'10px', paddingBottom:'10px' }}>Enable Prevention</div>
          <div>In addition to detections, Elastic security can prevent threats before they happen. You can disable detections anytime in the agent policy configurations settings.</div>
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

