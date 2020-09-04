/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSwitch, EuiHorizontalRule, EuiText, EuiFormRow } from '@elastic/eui';

import { PhaseWithAllocationAction } from '../../../../services/policies/types';
import { AdvancedSectionLayout } from '../advanced_section_layout';
import { NodeAllocation } from './node_allocation';
import { SharedProps } from './types';

import './data_tier_allocation.scss';
import { LearnMoreLink } from '../learn_more_link';

const learnMoreLink = (
  <LearnMoreLink
    text={
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.editPolicy.learnAboutShardAllocationLink"
        defaultMessage="Learn about shard allocation"
      />
    }
    docPath="modules-cluster.html#cluster-shard-allocation-settings"
  />
);

const i18nTexts = {
  useDataTierAllocation: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.useDataTierSwitchLabel',
    { defaultMessage: 'Enable data tier allocation' }
  ),
  useCustomDataTierAllocation: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.common.dataTierAllocation.useCustomDataTierSwitchLabel',
    { defaultMessage: 'Use custom data tier allocation' }
  ),
};

export const DataTierAllocation = <T extends any>(
  props: React.PropsWithChildren<SharedProps<PhaseWithAllocationAction>>
) => {
  const { phaseData, setPhaseData, phase } = props;

  const isUsingDataTierAllocation =
    phaseData.dataTierAllocationType === 'custom' || phaseData.dataTierAllocationType === 'default';

  return (
    <div data-test-subj={`${phase}-dataTierAllocationControls`}>
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
      {isUsingDataTierAllocation ? (
        <AdvancedSectionLayout>
          <div className="indexLifecycleManagement__phase__dataTierAllocation__advancedSection">
            <EuiFormRow
              helpText={
                <EuiText size="xs">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.nodeAllocation.description"
                    defaultMessage="Use node attributes to control shard allocation. {learnMoreLink}."
                    values={{ learnMoreLink }}
                  />
                </EuiText>
              }
            >
              <EuiSwitch
                data-test-subj="useCustomAllocationSwitch"
                label={i18nTexts.useCustomDataTierAllocation}
                checked={phaseData.dataTierAllocationType === 'custom'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPhaseData('dataTierAllocationType', 'custom');
                  } else {
                    setPhaseData('dataTierAllocationType', 'default');
                  }
                }}
              />
            </EuiFormRow>
            {props.phaseData.dataTierAllocationType === 'custom' ? (
              <>
                <NodeAllocation {...props} />
              </>
            ) : null}
          </div>
        </AdvancedSectionLayout>
      ) : null}
    </div>
  );
};
