/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useEffect, FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Ping } from '../../../../common/runtime_types';
import { getJourneySteps, getStepScreenshot } from '../../../state/actions/journey';
import { JourneyState } from '../../../state/reducers/journey';
import { journeySelector } from '../../../state/selectors';
import { EmptyStepState } from './empty_journey';
import { ExecutedJourney } from './executed_journey';
import { ConsoleOutputStepList } from './console_output_steps';

interface ScriptExpandedRowProps {
  checkGroup?: string;
}

export const ScriptExpandedRow: React.FC<ScriptExpandedRowProps> = ({ checkGroup }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (checkGroup) {
      dispatch(getJourneySteps({ checkGroup }));
    }
  }, [dispatch, checkGroup]);

  const journeys = useSelector(journeySelector);
  const journey = journeys.find((j) => j.checkGroup === checkGroup);

  const fetchScreenshot = useCallback(
    (stepIndex: number) => {
      dispatch(getStepScreenshot({ checkGroup: checkGroup!, stepIndex }));
    },
    [checkGroup, dispatch]
  );

  return (
    <ScriptExpandedRowComponent
      checkGroup={checkGroup}
      fetchScreenshot={fetchScreenshot}
      journey={journey}
    />
  );
};

type ComponentProps = ScriptExpandedRowProps & {
  fetchScreenshot: (stepIndex: number) => void;
  journey: JourneyState;
};

const someStepEnd = (step: Ping) => step.synthetics?.type === 'step/end';
const someStepConsole = (step: Ping) =>
  ['stderr', 'cmd/status'].indexOf(step.synthetics?.type) !== -1;

export const ScriptExpandedRowComponent: FC<ComponentProps> = ({
  checkGroup,
  journey,
  fetchScreenshot,
}) => {
  if (!journey || journey.steps.length === 0) {
    return <EmptyStepState checkGroup={checkGroup} />;
  }

  if (journey.loading) {
    return (
      <div>
        <EuiLoadingSpinner />
      </div>
    );
  }

  if (journey.steps.some(someStepEnd))
    return <ExecutedJourney journey={journey} fetchScreenshot={fetchScreenshot} />;

  if (journey.steps.some(someStepConsole)) return <ConsoleOutputStepList journey={journey} />;

  // TODO: should not happen, this means that the journey has no step/end and no console logs, but some other steps; filmstrip, screenshot, etc.
  // we should probably create an error prompt letting the user know this step is not supported yet
  return null;
};
