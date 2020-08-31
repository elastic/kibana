/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';

import { PhaseWithAllocationAction } from '../../../../services/policies/types';
import { AdvancedSectionLayout } from '../advanced_section_layout';
import { NodeAllocation } from './node_allocation';
import { SharedProps } from './types';

const i18nTexts = {
  useDataTierAllocation: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.useDataTierSwitchLabel',
    { defaultMessage: 'Enable data tier allocation' }
  ),
};

export const DataTierAllocation = <T extends any>(
  props: React.PropsWithChildren<SharedProps<PhaseWithAllocationAction>>
) => {
  const { phaseData, setPhaseData } = props;

  const isUsingDataTierAllocation =
    phaseData.dataTierAllocationType === 'custom' || phaseData.dataTierAllocationType === 'default';

  return (
    <>
      <EuiSwitch
        label={i18nTexts.useDataTierAllocation}
        checked={isUsingDataTierAllocation}
        onChange={(e) => {
          if (!e.target.checked) {
            props.setPhaseData('dataTierAllocationType', 'none');
          } else {
            props.setPhaseData('dataTierAllocationType', 'default');
          }
        }}
      />
      <EuiSpacer size="s" />
      {isUsingDataTierAllocation ? (
        <AdvancedSectionLayout>
          <div style={{ paddingLeft: 24 }}>
            <EuiSwitch
              label="Use custom data tier allocation."
              checked={phaseData.dataTierAllocationType === 'custom'}
              onChange={(e) => {
                if (e.target.checked) {
                  setPhaseData('dataTierAllocationType', 'custom');
                } else {
                  setPhaseData('dataTierAllocationType', 'default');
                }
              }}
            />
            <EuiSpacer size="m" />
            {props.phaseData.dataTierAllocationType === 'custom' ? (
              <NodeAllocation {...props} />
            ) : null}
          </div>
        </AdvancedSectionLayout>
      ) : null}
    </>
  );
};
