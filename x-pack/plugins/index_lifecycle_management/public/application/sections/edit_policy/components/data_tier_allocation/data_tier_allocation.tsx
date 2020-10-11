/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFormRow, EuiSpacer, EuiSuperSelect, EuiSuperSelectOption } from '@elastic/eui';

import { DataTierAllocationType } from '../../../../../../common/types';
import { NodeAllocation } from './node_allocation';
import { SharedProps } from './types';

import './data_tier_allocation.scss';

type SelectOptions = EuiSuperSelectOption<DataTierAllocationType>;

const i18nTexts = {
  allocationFieldLabel: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.allocationFieldLabel',
    { defaultMessage: 'Data tier options' }
  ),
  allocationOptions: {
    warm: {
      default: {
        input: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.warm.defaultOption.input',
          { defaultMessage: 'Use warm nodes (recommended)' }
        ),
        helpText: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.warm.defaultOption.helpText',
          { defaultMessage: 'Move data to nodes in the warm tier.' }
        ),
      },
      none: {
        inputDisplay: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.warm.noneOption.input',
          { defaultMessage: 'Off' }
        ),
        helpText: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.warm.noneOption.helpText',
          { defaultMessage: 'Do not move data in the warm phase.' }
        ),
      },
      custom: {
        inputDisplay: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.warm.customOption.input',
          { defaultMessage: 'Custom' }
        ),
        helpText: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.warm.customOption.helpText',
          { defaultMessage: 'Move data based on node attributes.' }
        ),
      },
    },
    cold: {
      default: {
        input: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.cold.defaultOption.input',
          { defaultMessage: 'Use cold nodes (recommended)' }
        ),
        helpText: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.cold.defaultOption.helpText',
          { defaultMessage: 'Move data to nodes in the cold tier.' }
        ),
      },
      none: {
        inputDisplay: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.cold.noneOption.input',
          { defaultMessage: 'Off' }
        ),
        helpText: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.cold.noneOption.helpText',
          { defaultMessage: 'Do not move data in the cold phase.' }
        ),
      },
      custom: {
        inputDisplay: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.cold.customOption.input',
          { defaultMessage: 'Custom' }
        ),
        helpText: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.cold.customOption.helpText',
          { defaultMessage: 'Move data based on node attributes.' }
        ),
      },
    },
  },
};

export const DataTierAllocation: FunctionComponent<SharedProps> = (props) => {
  const { phaseData, setPhaseData, phase, hasNodeAttributes } = props;

  return (
    <div data-test-subj={`${phase}-dataTierAllocationControls`}>
      <EuiFormRow label={i18nTexts.allocationFieldLabel}>
        <EuiSuperSelect
          data-test-subj="dataTierSelect"
          hasDividers
          valueOfSelected={phaseData.dataTierAllocationType}
          onChange={(value) => setPhaseData('dataTierAllocationType', value)}
          options={
            [
              {
                value: 'default',
                inputDisplay: i18nTexts.allocationOptions[phase].default.input,
                dropdownDisplay: (
                  <>
                    <strong>{i18nTexts.allocationOptions[phase].default.input}</strong>
                    <EuiText size="s" color="subdued">
                      <p className="euiTextColor--subdued">
                        {i18nTexts.allocationOptions[phase].default.helpText}
                      </p>
                    </EuiText>
                  </>
                ),
              },
              {
                value: 'none',
                inputDisplay: i18nTexts.allocationOptions[phase].none.inputDisplay,
                dropdownDisplay: (
                  <>
                    <strong>{i18nTexts.allocationOptions[phase].none.inputDisplay}</strong>
                    <EuiText size="s" color="subdued">
                      <p className="euiTextColor--subdued">
                        {i18nTexts.allocationOptions[phase].none.helpText}
                      </p>
                    </EuiText>
                  </>
                ),
              },
              {
                'data-test-subj': 'customDataAllocationOption',
                value: 'custom',
                inputDisplay: i18nTexts.allocationOptions[phase].custom.inputDisplay,
                dropdownDisplay: (
                  <>
                    <strong>{i18nTexts.allocationOptions[phase].custom.inputDisplay}</strong>
                    <EuiText size="s" color="subdued">
                      <p className="euiTextColor--subdued">
                        {i18nTexts.allocationOptions[phase].custom.helpText}
                      </p>
                    </EuiText>
                  </>
                ),
              },
            ] as SelectOptions[]
          }
        />
      </EuiFormRow>
      {phaseData.dataTierAllocationType === 'custom' && hasNodeAttributes && (
        <>
          <EuiSpacer size="s" />
          <div className="indexLifecycleManagement__phase__dataTierAllocation__controlSection">
            <NodeAllocation {...props} />
          </div>
        </>
      )}
    </div>
  );
};
