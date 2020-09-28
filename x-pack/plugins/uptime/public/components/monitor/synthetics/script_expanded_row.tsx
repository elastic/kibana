/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiBasicTable,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useContext, useEffect, FC, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Ping } from '../../../../common/runtime_types';
import { getJourneySteps, getStepScreenshot } from '../../../state/actions/journey';
import { JourneyState } from '../../../state/reducers/journey';
import { journeySelector } from '../../../state/selectors';
import { UptimeThemeContext } from '../../../contexts';
import { EmptyStepState } from './empty_journey';
import { ExecutedJourney } from './executed_journey';
import { ConsoleOutputStepList } from './console_output_steps';

interface ScriptExpandedRowProps {
  checkGroup?: string;
}

export const ScriptExpandedRow: React.FC<ScriptExpandedRowProps> = (props) => {
  const { checkGroup } = props;
  const dispatch = useDispatch();
  useEffect(() => {
    if (checkGroup) {
      dispatch(getJourneySteps({ checkGroup }));
    }
  }, [dispatch, checkGroup]);

  const f = useSelector(journeySelector);
  const journey = f.journeys.find((j) => j.checkGroup === checkGroup);
  const fetchScreenshot = useCallback(
    (stepIndex: number) => {
      dispatch(getStepScreenshot({ checkGroup: checkGroup!, stepIndex }));
    },
    [checkGroup, dispatch]
  );
  if (!journey) {
    return <div>this probably shouldn't happen, but there's no info for this check group</div>;
  }
  if (journey.loading) {
    return (
      <div>
        <EuiLoadingSpinner />
      </div>
    );
  }
  if (journey.steps.length === 0) {
    return <EmptyStepState journey={journey} />;
  }
  return (
    <ScriptExpandedRowComponent {...props} fetchScreenshot={fetchScreenshot} journey={journey} />
  );
};

type ComponentProps = ScriptExpandedRowProps & {
  fetchScreenshot: (stepIndex: number) => void;
  journey: JourneyState;
};

export const ScriptExpandedRowComponent: FC<ComponentProps> = ({ journey, fetchScreenshot }) => {
  const hasStepEnd = journey.steps.some((step) => step.synthetics?.type === 'step/end');
  if (hasStepEnd) return <ExecutedJourney journey={journey} fetchScreenshot={fetchScreenshot} />;
  return <ConsoleOutputStepList journey={journey} />;
};
