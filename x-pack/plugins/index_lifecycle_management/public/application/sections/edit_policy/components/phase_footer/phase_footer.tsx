/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiIcon, EuiText, EuiLink, EuiPanel } from '@elastic/eui';

import { usePhaseTimings } from '../../form';

import { InfinityIcon } from '../infinity_icon';

import './phase_footer.scss';

interface Props {
  phase: 'hot' | 'warm' | 'cold';
}

export const PhaseFooter: FunctionComponent<Props> = ({ phase }) => {
  const phaseTimings = usePhaseTimings();
  const phaseConfiguration = phaseTimings[phase];
  const setValue = phaseTimings.setDeletePhaseEnabled;

  if (phaseConfiguration === 'disabled' || phaseConfiguration === 'enabled') {
    return (
      <EuiPanel className={'ilmPhaseFooter'} hasShadow={false}>
        <EuiText size={'s'}>&nbsp;</EuiText>
      </EuiPanel>
    );
  }

  if (phaseConfiguration === 'forever') {
    return (
      <EuiPanel color={'subdued'} className={'ilmPhaseFooter'} hasShadow={false}>
        <InfinityIcon size={'s'} />{' '}
        <EuiText size={'s'} grow={false} className={'eui-displayInlineBlock'}>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.phaseTiming.foreverTimingDescription"
            defaultMessage="Data will remain in this phase forever."
          />{' '}
          <EuiLink onClick={() => setValue(true)} data-test-subj={'enableDeletePhaseLink'}>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.enablePhaseButtonLabel"
              defaultMessage="Enable data deletion"
            />
          </EuiLink>
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel color={'subdued'} className={'ilmPhaseFooter'} hasShadow={false}>
      <EuiIcon type={'storage'} size={'s'} />{' '}
      <EuiText size={'s'} grow={false} className={'eui-displayInlineBlock'}>
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.phaseTiming.beforeDeleteDescription"
          defaultMessage="Data will be deleted after this phase."
        />{' '}
        <EuiLink onClick={() => setValue(false)} data-test-subj={'disableDeletePhaseLink'}>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.disablePhaseButtonLabel"
            defaultMessage="Disable data deletion"
          />
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );
};
