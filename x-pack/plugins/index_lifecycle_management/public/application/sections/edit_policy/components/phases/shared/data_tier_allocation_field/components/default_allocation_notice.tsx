/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';

import { PhaseWithAllocation, DataTierRole } from '../../../../../../../../../common/types';

import { AllocationNodeRole } from '../../../../../../../lib';

const i18nTextsNodeRoleToDataTier: Record<DataTierRole, string> = {
  data_hot: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.dataTierHotLabel', {
    defaultMessage: 'hot',
  }),
  data_warm: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.dataTierWarmLabel', {
    defaultMessage: 'warm',
  }),
  data_cold: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.dataTierColdLabel', {
    defaultMessage: 'cold',
  }),
};

const i18nTexts = {
  notice: {
    warm: {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotice.warm.title',
        { defaultMessage: 'No nodes assigned to the warm tier' }
      ),
      body: (nodeRole: DataTierRole) =>
        i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotice.warm', {
          defaultMessage:
            'This policy will move data in the warm phase to {tier} tier nodes instead.',
          values: { tier: i18nTextsNodeRoleToDataTier[nodeRole] },
        }),
    },
    cold: {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotice.cold.title',
        { defaultMessage: 'No nodes assigned to the cold tier' }
      ),
      body: (nodeRole: DataTierRole) =>
        i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotice.cold', {
          defaultMessage:
            'This policy will move data in the cold phase to {tier} tier nodes instead.',
          values: { tier: i18nTextsNodeRoleToDataTier[nodeRole] },
        }),
    },
  },
  warning: {
    warm: {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableTitle',
        { defaultMessage: 'No nodes assigned to the warm tier' }
      ),
      body: i18n.translate(
        'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableBody',
        {
          defaultMessage:
            'Assign at least one node to the warm or hot tier to use role-based allocation. The policy will fail to complete allocation if there are no available nodes.',
        }
      ),
    },
    cold: {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.coldPhase.dataTier.defaultAllocationNotAvailableTitle',
        { defaultMessage: 'No nodes assigned to the cold tier' }
      ),
      body: i18n.translate(
        'xpack.indexLifecycleMgmt.coldPhase.dataTier.defaultAllocationNotAvailableBody',
        {
          defaultMessage:
            'Assign at least one node to the cold, warm, or hot tier to use role-based allocation. The policy will fail to complete allocation if there are no available nodes.',
        }
      ),
    },
  },
};

interface Props {
  phase: PhaseWithAllocation;
  targetNodeRole: AllocationNodeRole;
}

export const DefaultAllocationNotice: FunctionComponent<Props> = ({ phase, targetNodeRole }) => {
  const content =
    targetNodeRole === 'none' ? (
      <EuiCallOut
        data-test-subj="defaultAllocationWarning"
        title={i18nTexts.warning[phase].title}
        color="warning"
      >
        {i18nTexts.warning[phase].body}
      </EuiCallOut>
    ) : (
      <EuiCallOut data-test-subj="defaultAllocationNotice" title={i18nTexts.notice[phase].title}>
        {i18nTexts.notice[phase].body(targetNodeRole)}
      </EuiCallOut>
    );

  return content;
};
