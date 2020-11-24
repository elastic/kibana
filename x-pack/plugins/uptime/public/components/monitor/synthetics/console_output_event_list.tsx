/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCodeBlock, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { Ping } from '../../../../common/runtime_types';
import { JourneyState } from '../../../state/reducers/journey';
import { ConsoleEvent } from './console_event';

interface Props {
  journey: JourneyState;
}

const isConsoleStep = (step: Ping) =>
  step.synthetics?.type === 'stderr' ||
  step.synthetics?.type === 'stdout' ||
  step.synthetics?.type === 'cmd/status';

export const ConsoleOutputEventList: FC<Props> = ({ journey }) => (
  <div>
    <EuiTitle>
      <h4>
        <FormattedMessage
          id="xpack.uptime.synthetics.consoleStepList.title"
          defaultMessage="No steps ran"
        />
      </h4>
    </EuiTitle>
    <EuiSpacer />
    <p>
      <FormattedMessage
        id="xpack.uptime.synthetics.consoleStepList.message"
        defaultMessage="This journey failed to run, recorded console output is shown below:"
      />
    </p>
    <EuiSpacer />
    <EuiCodeBlock>
      {journey.steps.filter(isConsoleStep).map((consoleEvent) => (
        <ConsoleEvent event={consoleEvent} key={consoleEvent.docId + '_console-event-row'} />
      ))}
    </EuiCodeBlock>
  </div>
);
