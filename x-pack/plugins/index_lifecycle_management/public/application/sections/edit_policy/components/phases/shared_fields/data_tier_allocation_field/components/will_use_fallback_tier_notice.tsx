/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';

import { PhaseWithAllocation, DataTierRole } from '../../../../../../../../../common/types';

const nodeRoleToFallbackTierMap: Partial<Record<DataTierRole, string>> = {
  data_hot: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.dataTierHotLabel', {
    defaultMessage: 'hot',
  }),
  data_warm: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.dataTierWarmLabel', {
    defaultMessage: 'warm',
  }),
};

const i18nTexts = {
  warm: {
    title: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.willUseFallbackTierTitle', {
      defaultMessage: 'No nodes assigned to the warm tier',
    }),
    body: (nodeRole: DataTierRole) =>
      i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.willUseFallbackTierDescription', {
        defaultMessage:
          'This policy will move data in the warm phase to {tier} tier nodes instead.',
        values: { tier: nodeRoleToFallbackTierMap[nodeRole] },
      }),
  },
  cold: {
    title: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.willUseFallbackTierTitle', {
      defaultMessage: 'No nodes assigned to the cold tier',
    }),
    body: (nodeRole: DataTierRole) =>
      i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.willUseFallbackTierDescription', {
        defaultMessage:
          'This policy will move data in the cold phase to {tier} tier nodes instead.',
        values: { tier: nodeRoleToFallbackTierMap[nodeRole] },
      }),
  },
};

const customizeWithNodeAttributeDescription = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.customizeWithNodeAttributeDescription',
  {
    defaultMessage:
      'Define custom node attributes in elasticsearch.yml to allocate indices based on these attributes.',
  }
);

interface Props {
  phase: PhaseWithAllocation;
  targetNodeRole: DataTierRole;
  isUsingNodeAttributes?: boolean;
}

export const WillUseFallbackTierNotice: FunctionComponent<Props> = ({
  isUsingNodeAttributes,
  phase,
  targetNodeRole,
}) => {
  return (
    <EuiCallOut data-test-subj="willUseFallbackTierNotice" title={i18nTexts[phase].title}>
      <p>{i18nTexts[phase].body(targetNodeRole)}</p>

      {isUsingNodeAttributes && <p>{customizeWithNodeAttributeDescription}</p>}
    </EuiCallOut>
  );
};
