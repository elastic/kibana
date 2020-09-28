/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCodeBlock, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { JourneyState } from '../../../state/reducers/journey';
import { ConsoleStep } from './console_step';

interface ConsoleOutputStepListProps {
  journey: JourneyState;
}

export const ConsoleOutputStepList: FC<ConsoleOutputStepListProps> = ({ journey }) => {
  return (
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
        {journey.steps.map((s) => (
          <ConsoleStep step={s} />
        ))}
      </EuiCodeBlock>
    </div>
  );
};
