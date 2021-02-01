/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiIcon, EuiText, EuiLink, EuiPanel } from '@elastic/eui';

import { InfinityIcon } from '../infinity_icon';

import './timing_footer.scss';

interface Props {
  timingInMs?: number;
  timingLabel?: string;
  isLastActivePhase: boolean;
  setValue: (value: boolean) => void;
}
export const TimingFooter: FunctionComponent<Props> = ({
  timingInMs,
  timingLabel,
  isLastActivePhase,
  setValue,
}) => {
  if (timingInMs === undefined) {
    return null;
  }

  if (timingInMs === Infinity) {
    return (
      <EuiPanel color={'warning'} className={'ilmPhaseFooter ilmPhaseFooter--warning'}>
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
    <EuiPanel color={'subdued'} className={'ilmPhaseFooter'}>
      <EuiIcon type={'storage'} size={'s'} />{' '}
      <EuiText size={'s'} grow={false} className={'eui-displayInlineBlock'}>
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.phaseTiming.daysTimingDescription"
          defaultMessage="Data remains in this phase for {timingLabel}."
          values={{
            timingLabel,
          }}
        />
        {isLastActivePhase && (
          <>
            {' '}
            <EuiLink onClick={() => setValue(false)} data-test-subj={'disableDeletePhaseLink'}>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.disablePhaseButtonLabel"
                defaultMessage="Disable data deletion"
              />
            </EuiLink>
          </>
        )}
      </EuiText>
    </EuiPanel>
  );
};
