/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useEffect } from 'react';
import { EuiButtonGroup, EuiButtonGroupOption, EuiText } from '@elastic/eui';

import {
  AllocationType,
  Phase,
  Phases,
  WarmPhase,
  ColdPhase,
} from '../../../../services/policies/types';

import './custom_data_tier_allocation.scss';
import { NodeAllocation } from './node_allocation';
import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';

interface ButtonOption extends EuiButtonGroupOption {
  id: AllocationType;
}

const i18nTexts = {
  allocationTypes: {
    none: {
      label: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.customDataTierAllocation.noneOptionLabel',
        { defaultMessage: 'None' }
      ),
      description: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.customDataTierAllocation.noneOptionDescription',
        { defaultMessage: 'Data in this phase will remain on the same node.' }
      ),
    },
    custom: {
      label: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.customDataTierAllocation.customOptionLabel',
        { defaultMessage: 'Custom' }
      ),
    },
  },
};

const buttonOptions: ButtonOption[] = [
  { id: 'custom-allocation', label: i18nTexts.allocationTypes.custom.label },
  { id: 'none', label: i18nTexts.allocationTypes.none.label },
];

interface Props<T extends Phase> {
  phase: keyof Phases & string;
  errors?: PhaseValidationErrors<T>;
  defaultAllocationValue: AllocationType;
  phaseData: T;
  setPhaseData: (dataKey: keyof T & string, value: string) => void;
  isShowingErrors: boolean;
}
export const CustomDataTierAllocation: FunctionComponent<Props<WarmPhase | ColdPhase>> = ({
  defaultAllocationValue,
  setPhaseData,
  ...restProps
}) => {
  const contentMap: Record<AllocationType, React.ReactNode> = {
    'custom-allocation': (
      <div className="indexLifecycleManagement__dataTierAllocation__contentBox__customAllocationPanel">
        <NodeAllocation setPhaseData={setPhaseData} {...restProps} />
      </div>
    ),
    none: (
      <EuiText
        className="indexLifecycleManagement__dataTierAllocation__contentBox__descriptionPanel"
        size="s"
      >
        <p>{i18nTexts.allocationTypes.none.description}</p>
      </EuiText>
    ),
  };

  useEffect(
    () => {
      if (restProps.phaseData.allocationType === undefined) {
        setPhaseData('allocationType', defaultAllocationValue);
      }
    },
    // Do this once only when mounting this component
    [] /* eslint-disable-line react-hooks/exhaustive-deps */
  );

  return (
    <div role="region">
      <EuiText style={{ paddingBottom: '4px' }} size="xs">
        <b>Data tier allocation</b>
      </EuiText>
      <EuiButtonGroup
        className="indexLifecycleManagement__dataTierAllocation__buttonGroup"
        color="primary"
        idSelected={restProps.phaseData.allocationType}
        options={buttonOptions}
        onChange={(id) => setPhaseData('allocationType', id as AllocationType)}
        isFullWidth
      />
      {contentMap[restProps.phaseData.allocationType!] ?? null}
    </div>
  );
};
