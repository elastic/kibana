/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';
import { ConsoleEvent } from './console_event';
import { JourneyStep } from '../../../common/runtime_types/ping';
import { JourneyState } from '../../state/reducers/journey';

interface Props {
  journey: JourneyState;
}

const CONSOLE_STEP_TYPES = ['stderr', 'stdout', 'cmd/status'];

const isConsoleStep = (step: JourneyStep) =>
  CONSOLE_STEP_TYPES.some((type) => type === step.synthetics.type);

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
        <ConsoleEvent event={consoleEvent} key={consoleEvent._id + '_console-event-row'} />
      ))}
    </EuiCodeBlock>
  </div>
);
