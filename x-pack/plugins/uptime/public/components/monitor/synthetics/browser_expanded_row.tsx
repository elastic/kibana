/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { useEffect, FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Ping } from '../../../../common/runtime_types';
import { getJourneySteps } from '../../../state/actions/journey';
import { JourneyState } from '../../../state/reducers/journey';
import { journeySelector } from '../../../state/selectors';
import { EmptyJourney } from './empty_journey';
import { ExecutedJourney } from './executed_journey';
import { ConsoleOutputEventList } from './console_output_event_list';

interface BrowserExpandedRowProps {
  checkGroup?: string;
}

export const BrowserExpandedRow: React.FC<BrowserExpandedRowProps> = ({ checkGroup }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (checkGroup) {
      dispatch(getJourneySteps({ checkGroup }));
    }
  }, [dispatch, checkGroup]);

  const journeys = useSelector(journeySelector);
  const journey = journeys[checkGroup ?? ''];

  return <BrowserExpandedRowComponent checkGroup={checkGroup} journey={journey} />;
};

type ComponentProps = BrowserExpandedRowProps & {
  journey?: JourneyState;
};

const stepEnd = (step: Ping) => step.synthetics?.type === 'step/end';
const stepConsole = (step: Ping) =>
  ['stderr', 'cmd/status'].indexOf(step.synthetics?.type ?? '') !== -1;

export const BrowserExpandedRowComponent: FC<ComponentProps> = ({ checkGroup, journey }) => {
  if (!!journey && journey.loading) {
    return (
      <div>
        <EuiLoadingSpinner />
      </div>
    );
  }

  if (!journey || journey.steps.length === 0) {
    return <EmptyJourney checkGroup={checkGroup} />;
  }

  if (journey.steps.some(stepEnd)) return <ExecutedJourney journey={journey} />;

  if (journey.steps.some(stepConsole)) return <ConsoleOutputEventList journey={journey} />;

  // TODO: should not happen, this means that the journey has no step/end and no console logs, but some other steps; filmstrip, screenshot, etc.
  // we should probably create an error prompt letting the user know this step is not supported yet
  return null;
};
