/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React, { FC } from 'react';
import { JourneyState } from '../../../state/reducers/journey';

interface EmptyStepStateProps {
  journey: JourneyState;
}

export const EmptyStepState: FC<EmptyStepStateProps> = ({ journey: { checkGroup } }) => (
  <EuiEmptyPrompt
    iconType="cross"
    title={<h2>There are no steps for this journey</h2>}
    body={
      <>
        <p>There are no steps associated with the run of this journey.</p>
        <p>
          The journey's check group is
          <code>{checkGroup}</code>.
        </p>
        <p>There is no further information to display.</p>
      </>
    }
  />
);
