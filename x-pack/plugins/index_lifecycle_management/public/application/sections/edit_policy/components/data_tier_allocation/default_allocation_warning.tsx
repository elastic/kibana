/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { PhaseWithAllocation } from '../../../../../../common/types';

const i18nTexts = {
  warm: {
    title: i18n.translate(
      'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableTitle',
      { defaultMessage: 'No nodes assigned to the warm tier' }
    ),
    body: i18n.translate(
      'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableBody',
      {
        defaultMessage:
          'Assign at least one node to the warm tier to use role-based allocation. The policy will fail to complete allocation if there are no warm nodes.',
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
          'This policy will not complete allocation because there are no cold nodes. Assign at least one node to the cold tier.',
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
          'This policy will not complete allocation because there are no frozen nodes. Assign at least one node to the frozen tier.',
      }
    ),
  },
};

interface Props {
  phase: PhaseWithAllocation;
}

export const DefaultAllocationWarning: FunctionComponent<Props> = ({ phase }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        data-test-subj="defaultAllocationWarning"
        title={i18nTexts[phase].title}
        color="warning"
      >
        {i18nTexts[phase].body}
      </EuiCallOut>
    </>
  );
};
