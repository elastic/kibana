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
import { StatusBadge } from './status_badge';
import { StepScreenshotDisplay } from './step_screenshot_display';
import { Accordion } from './accordion';
import { UptimeThemeContext } from '../../../contexts';

interface EmptyStepStateProps {
  journey: JourneyState;
}

const EmptyStepState: FC<EmptyStepStateProps> = ({ journey: { checkGroup } }) => (
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

interface ScriptExpandedRowProps {
  checkGroup?: string;
}

interface StepStatusCount {
  succeeded: number;
  failed: number;
}

function reduceStepStatus(prev: StepStatusCount, cur: Ping): StepStatusCount {
  if (cur.synthetics?.payload?.status === 'succeeded') {
    prev.succeeded += 1;
    return prev;
  }
  prev.failed += 1;
  return prev;
}

function statusMessage(count: StepStatusCount) {
  if (count.succeeded === 0) {
    return `${count.failed} Steps - all failed.`;
  } else if (count.failed === 0) {
    return `${count.succeeded} Steps - all succeeded`;
  }
  return `${count.succeeded + count.failed} Steps - ${count.succeeded} succeeded`;
}

const CODE_BLOCK_OVERFLOW_HEIGHT = 360;

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

const StepComponent: FC<{
  step: Ping;
  index: number;
  fetchScreenshot: (stepIndex: number) => void;
}> = ({ step, index, fetchScreenshot }) => {
  console.log('step', step);
  return (
    <>
      <div style={{ padding: '8px' }}>
        <div>
          <EuiText>
            <strong>
              {index + 1}. {step.synthetics?.step.name}
            </strong>
          </EuiText>
        </div>
        <EuiSpacer size="s" />
        <div>
          <StatusBadge status={step.synthetics.payload.status} />
        </div>
        <EuiSpacer />
        <div>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <StepScreenshotDisplay
                isLoading={step.synthetics.screenshotLoading}
                screenshot={step.synthetics.blob}
                stepIndex={step.synthetics.step.index}
                fetchScreenshot={fetchScreenshot}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <Accordion
                id={step.synthetics?.step?.name + String(index)}
                buttonContent="Step script"
                overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
                language="javascript"
              >
                {step.synthetics?.payload?.source}
              </Accordion>
              <Accordion
                id={`${step.synthetics?.step?.name}_error`}
                buttonContent="Error"
                language="html"
                overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
              >
                {step.synthetics?.payload?.error?.message}
              </Accordion>
              <Accordion
                id={`${step.synthetics?.step?.name}_stack`}
                buttonContent="Stack trace"
                language="html"
                overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
              >
                {step.synthetics?.payload?.error?.stack}
              </Accordion>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
      <EuiSpacer />
    </>
  );
};

interface JourneyWithExecutedStepsProps {
  journey: JourneyState;
  fetchScreenshot: (stepIndex: number) => void;
}

const JourneyWithExecutedSteps: FC<JourneyWithExecutedStepsProps> = ({
  journey,
  fetchScreenshot,
}) => {
  return (
    <div>
      <EuiText>
        <h3>Summary information</h3>
        <p>{statusMessage(journey.steps.reduce(reduceStepStatus, { succeeded: 0, failed: 0 }))}</p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        {journey.steps
          .filter((step) => step.synthetics?.type === 'step/end')
          .map((step, index) => (
            <StepComponent
              key={index}
              index={index}
              step={step}
              fetchScreenshot={fetchScreenshot}
            />
          ))}
      </EuiFlexGroup>
    </div>
  );
};

interface ConsoleStepProps {
  step: Ping;
}

const ConsoleStep: FC<ConsoleStepProps> = ({ step }) => {
  const c = useContext(UptimeThemeContext);

  let typeColor: string | null;
  if (step.synthetics?.type === 'stderr') {
    typeColor = c.colors.danger;
  } else {
    typeColor = null;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>{step.timestamp}</EuiFlexItem>
      <EuiFlexItem grow={false} style={{ color: typeColor }}>
        {step.synthetics?.type}
      </EuiFlexItem>
      <EuiFlexItem>{step.synthetics?.payload?.message}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ConsoleOutputStepsProps {
  journey: JourneyState;
}

const ConsoleOutputSteps: FC<ConsoleOutputStepsProps> = ({ journey }) => {
  console.log(journey);
  return (
    <div>
      <EuiTitle>
        <h4>No steps ran</h4>
      </EuiTitle>
      <EuiSpacer />
      <p>This journey failed to run, recorded console output is shown below:</p>
      <EuiSpacer />
      <EuiCodeBlock>
        {journey.steps.map((s) => (
          <ConsoleStep step={s} />
        ))}
      </EuiCodeBlock>
    </div>
  );
};

type ComponentProps = ScriptExpandedRowProps & {
  fetchScreenshot: (stepIndex: number) => void;
  journey: JourneyState;
};

export const ScriptExpandedRowComponent: FC<ComponentProps> = ({ journey, fetchScreenshot }) => {
  const hasStepEnd = journey.steps.some((step) => step.synthetics?.type === 'step/end');
  if (hasStepEnd)
    return <JourneyWithExecutedSteps journey={journey} fetchScreenshot={fetchScreenshot} />;
  return <ConsoleOutputSteps journey={journey} />;
};
