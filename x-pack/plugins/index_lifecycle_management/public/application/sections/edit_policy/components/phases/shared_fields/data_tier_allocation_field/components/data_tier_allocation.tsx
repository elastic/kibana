/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer, EuiSuperSelectOption } from '@elastic/eui';

import { UseField, SuperSelectField, useFormData } from '../../../../../../../../shared_imports';
import { PhaseWithAllocation } from '../../../../../../../../../common/types';

import { DataTierAllocationType } from '../../../../../types';

import { NodeAllocation } from './node_allocation';
import { SharedProps } from './types';

import './data_tier_allocation.scss';

type SelectOptions = EuiSuperSelectOption<DataTierAllocationType>;

const i18nTexts = {
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

const getSelectOptions = (phase: PhaseWithAllocation, disableDataTierOption: boolean) =>
  [
    disableDataTierOption
      ? undefined
      : {
          'data-test-subj': 'defaultDataAllocationOption',
          value: 'node_roles',
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
      'data-test-subj': 'customDataAllocationOption',
      value: 'node_attrs',
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
    {
      'data-test-subj': 'noneDataAllocationOption',
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
  ].filter(Boolean) as SelectOptions[];

export const DataTierAllocation: FunctionComponent<SharedProps> = (props) => {
  const { phase, hasNodeAttributes, disableDataTierOption, isLoading } = props;

  const dataTierAllocationTypePath = `_meta.${phase}.dataTierAllocationType`;

  const [formData] = useFormData({
    watch: dataTierAllocationTypePath,
  });

  const dataTierAllocationType = get(formData, dataTierAllocationTypePath);

  return (
    <div data-test-subj={`${phase}-dataTierAllocationControls`}>
      <UseField path={dataTierAllocationTypePath}>
        {(field) => {
          /**
           * We reset the value to "custom" if we deserialized to "default".
           *
           * It would be better if we had all the information we needed before deserializing and
           * were able to handle this at the deserialization step instead of patching further down
           * the component tree - this should be a future refactor.
           */
          if (disableDataTierOption && field.value === 'node_roles') {
            field.setValue('node_attrs');
          }
          return (
            <SuperSelectField
              field={field}
              euiFieldProps={{
                isLoading,
                hasDividers: true,
                'data-test-subj': 'dataTierSelect',
                options: getSelectOptions(phase, disableDataTierOption),
              }}
            />
          );
        }}
      </UseField>
      {dataTierAllocationType === 'node_attrs' && hasNodeAttributes && (
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
