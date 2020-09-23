/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useContext, useEffect, FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UptimeThemeContext } from '../../../contexts';
import { getJourneySteps, getStepScreenshot } from '../../../state/actions/journey';
import { JourneyState } from '../../../state/reducers/journey';
import { journeySelector } from '../../../state/selectors';
import { StatusBadge } from './status_badge';
import { StepScreenshotDisplay } from './step_screenshot_display';

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
  const {
    colors: { success: successColor, danger: failColor },
  } = useContext(UptimeThemeContext);
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
    return <div>Didn't find any steps sadly</div>;
  }
  return (
    <ScriptExpandedRowComponent {...props} fetchScreenshot={fetchScreenshot} journey={journey} />
  );
};

type ComponentProps = ScriptExpandedRowProps & {
  fetchScreenshot: (stepIndex: number) => void;
  journey: JourneyState;
};

export const ScriptExpandedRowComponent: FC<ComponentProps> = ({ journey, fetchScreenshot }) => (
  <div>
    <EuiText>
      <h3>Summary information</h3>
      <p>{statusMessage(journey.steps.reduce(reduceStepStatus, { succeeded: 0, failed: 0 }))}</p>
    </EuiText>
    <EuiSpacer />
    <EuiFlexGroup direction="column">
      {journey.steps.map((step, index) => (
        <>
          <div style={{ padding: '8px' }}>
            <div>
              <EuiText>
                <strong>
                  {index + 1}. {step.synthetics.step.name}
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
                  {step?.synthetics?.payload?.source && (
                    <EuiAccordion
                      id={step.synthetics.step.name + index}
                      buttonContent="Step script"
                    >
                      <EuiText>
                        <EuiCode language="javascript">{step.synthetics.payload.source!}</EuiCode>
                      </EuiText>
                    </EuiAccordion>
                  )}
                  {step?.synthetics?.payload?.error && (
                    <EuiAccordion id={`${step.synthetics.step.name}_error`} buttonContent="Error">
                      <EuiCodeBlock
                        isCopyable={true}
                        overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
                        language="html"
                      >
                        {step.synthetics.payload.error.message}
                      </EuiCodeBlock>
                    </EuiAccordion>
                  )}
                  {step?.synthetics?.payload?.error?.stack && (
                    <EuiAccordion
                      id={`${step.synthetics.step.name}_stack`}
                      buttonContent="Stack trace"
                    >
                      <EuiCodeBlock
                        isCopyable={true}
                        overflowHeight={CODE_BLOCK_OVERFLOW_HEIGHT}
                        language="html"
                      >
                        {step.synthetics.payload.error.stack}
                      </EuiCodeBlock>
                    </EuiAccordion>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </div>
          <EuiSpacer />
        </>
      ))}
    </EuiFlexGroup>
  </div>
);
