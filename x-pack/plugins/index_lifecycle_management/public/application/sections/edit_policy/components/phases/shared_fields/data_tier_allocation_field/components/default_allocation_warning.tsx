/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';

import { PhaseWithAllocation } from '../../../../../../../../../common/types';

const i18nTexts = {
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
    frozen: {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.frozenPhase.dataTier.defaultAllocationNotAvailableTitle',
        { defaultMessage: 'No nodes assigned to the frozen tier' }
      ),
      body: i18n.translate(
        'xpack.indexLifecycleMgmt.frozenPhase.dataTier.defaultAllocationNotAvailableBody',
        {
          defaultMessage:
            'Assign at least one node to the frozen, cold, warm, or hot tier to use role-based allocation. The policy will fail to complete allocation if there are no available nodes.',
        }
      ),
    },
  },
};

interface Props {
  phase: PhaseWithAllocation;
}

export const DefaultAllocationWarning: FunctionComponent<Props> = ({ phase }) => {
  return (
    <EuiCallOut
      data-test-subj="defaultAllocationWarning"
      title={i18nTexts.warning[phase].title}
      color="warning"
    >
      {i18nTexts.warning[phase].body}
    </EuiCallOut>
  );
};
