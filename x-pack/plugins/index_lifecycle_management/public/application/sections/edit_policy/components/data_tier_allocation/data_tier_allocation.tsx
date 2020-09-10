/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFormRow, EuiSpacer, EuiSuperSelect, EuiSuperSelectOption } from '@elastic/eui';

import { DataTierAllocationType, PhaseWithAllocationAction } from '../../../../../../common/types';
import { NodeAllocation } from './node_allocation';
import { SharedProps } from './types';

import './data_tier_allocation.scss';

type SelectOptions = EuiSuperSelectOption<DataTierAllocationType>;

export const i18nTexts = {
  allocationFieldLabel: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.allocationFieldLabel',
    { defaultMessage: 'Data tier allocation' }
  ),
  allocationOptions: {
    auto: {
      inputDisplay: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.autoOption.input',
        { defaultMessage: 'Node role (recommended)' }
      ),
      helpText: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.autoOption.helpText',
        { defaultMessage: 'Node role-based allocation.' }
      ),
    },
    custom: {
      inputDisplay: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.customOption.input',
        { defaultMessage: 'Custom' }
      ),
      helpText: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.customOption.helpText',
        { defaultMessage: 'Node attribute-based allocation.' }
      ),
    },
    none: {
      inputDisplay: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.noneOption.input',
        { defaultMessage: 'None' }
      ),
      helpText: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.noneOption.helpText',
        { defaultMessage: 'Do not allocate data in this phase.' }
      ),
    },
  },
};

export const DataTierAllocation = (
  props: React.PropsWithChildren<SharedProps<PhaseWithAllocationAction>>
) => {
  const { phaseData, setPhaseData, phase, hasNodeAttributes } = props;

  return (
    <div data-test-subj={`${phase}-dataTierAllocationControls`}>
      <EuiFormRow label={i18nTexts.allocationFieldLabel}>
        <EuiSuperSelect
          hasDividers
          valueOfSelected={phaseData.dataTierAllocationType}
          onChange={(value) => setPhaseData('dataTierAllocationType', value)}
          options={
            [
              {
                value: 'default',
                inputDisplay: i18nTexts.allocationOptions.auto.inputDisplay,
                dropdownDisplay: (
                  <>
                    <strong>{i18nTexts.allocationOptions.auto.inputDisplay}</strong>
                    <EuiText size="s" color="subdued">
                      <p className="euiTextColor--subdued">
                        {i18nTexts.allocationOptions.auto.helpText}
                      </p>
                    </EuiText>
                  </>
                ),
              },
              {
                value: 'custom',
                inputDisplay: i18nTexts.allocationOptions.custom.inputDisplay,
                dropdownDisplay: (
                  <>
                    <strong>{i18nTexts.allocationOptions.custom.inputDisplay}</strong>
                    <EuiText size="s" color="subdued">
                      <p className="euiTextColor--subdued">
                        {i18nTexts.allocationOptions.custom.helpText}
                      </p>
                    </EuiText>
                  </>
                ),
              },
              {
                value: 'none',
                inputDisplay: i18nTexts.allocationOptions.none.inputDisplay,
                dropdownDisplay: (
                  <>
                    <strong>{i18nTexts.allocationOptions.none.inputDisplay}</strong>
                    <EuiText size="s" color="subdued">
                      <p className="euiTextColor--subdued">
                        {i18nTexts.allocationOptions.none.helpText}
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
