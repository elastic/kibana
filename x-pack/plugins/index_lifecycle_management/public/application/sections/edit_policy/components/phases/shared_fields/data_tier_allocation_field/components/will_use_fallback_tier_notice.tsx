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
import { nodeRoleToFallbackTierMap } from './node_role_to_fallback_tier_map';

const i18nTexts = {
  warm: {
    title: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.willUseFallbackTierTitle', {
      defaultMessage: 'No nodes assigned to the warm tier',
    }),
    body: (nodeRole: DataTierRole) =>
      i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.willUseFallbackTierDescription', {
        defaultMessage: 'If no warm nodes are available, data is stored in the {tier} tier.',
        values: { tier: nodeRoleToFallbackTierMap[nodeRole] },
      }),
  },
  cold: {
    title: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.willUseFallbackTierTitle', {
      defaultMessage: 'No nodes assigned to the cold tier',
    }),
    body: (nodeRole: DataTierRole) =>
      i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.willUseFallbackTierDescription', {
        defaultMessage: 'If no cold nodes are available, data is stored in the {tier} tier.',
        values: { tier: nodeRoleToFallbackTierMap[nodeRole] },
      }),
  },
};

interface Props {
  phase: PhaseWithAllocation;
  targetNodeRole: DataTierRole;
}

export const WillUseFallbackTierNotice: FunctionComponent<Props> = ({ phase, targetNodeRole }) => {
  return (
    <EuiCallOut data-test-subj="willUseFallbackTierNotice" title={i18nTexts[phase].title}>
      {i18nTexts[phase].body(targetNodeRole)}
    </EuiCallOut>
  );
};
