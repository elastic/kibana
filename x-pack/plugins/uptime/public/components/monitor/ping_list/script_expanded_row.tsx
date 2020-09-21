/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiCode,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Ping } from '../../../../common/runtime_types';
import { UptimeThemeContext } from '../../../contexts';
import { getJourneySteps, getStepScreenshot } from '../../../state/actions/journey';
import { journeySelector } from '../../../state/selectors';

interface ScreenshotDisplayProps {
  isLoading: boolean;
  screenshot: string;
}

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;

const ScreenshotDisplay: React.FC<ScreenshotDisplayProps> = ({ isLoading, screenshot }) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  } else if (isLoading === false && !screenshot) {
    return (
      <EuiIcon
        color="subdued"
        type="faceSad"
        style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
      />
    );
  }
  return (
    <img
      style={{
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        objectFit: 'cover',
        objectPosition: 'center top',
      }}
      src={`data:image/png;base64,${screenshot}`}
      alt="stuff"
    />
  );
};

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

export const ScriptExpandedRow: React.FC<ScriptExpandedRowProps> = ({ checkGroup }) => {
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
  console.log('the check grou', checkGroup);
  console.log('journeys', f);
  const journey = f.journeys.find((j) => j.checkGroup === checkGroup);
  const stepIndices =
    JSON.stringify(journey?.steps.map((s) => s.synthetics.step.index).sort()) ?? '[]';
  useEffect(() => {
    const parsedIndices = JSON.parse(stepIndices);
    if (parsedIndices.length) {
      parsedIndices.forEach((i: number) =>
        dispatch(getStepScreenshot({ checkGroup: checkGroup!, stepIndex: i }))
      );
    }
  }, [checkGroup, dispatch, stepIndices]);
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
  console.log(journey.screenshot);
  console.log(journey.steps.reduce(reduceStepStatus, { succeeded: 0, failed: 0 }));
  return (
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
                <EuiBadge
                  color={step.synthetics.payload.status === 'succeeded' ? successColor : failColor}
                >
                  {step.synthetics.payload.status === 'succeeded' ? 'Succeeded' : 'Failed'}
                </EuiBadge>
              </div>
              <EuiSpacer />
              <div>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <ScreenshotDisplay
                      isLoading={step.screenshotLoading}
                      screenshot={step.screenshot}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {/* <div>
                      <EuiButton>Step details</EuiButton>
                    </div> */}
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
                        <EuiCode style={{ whiteSpace: 'pre-wrap' }} language="html">
                          {step.synthetics.payload.error.message}
                        </EuiCode>
                      </EuiAccordion>
                    )}
                    {step?.synthetics?.payload?.error?.stack && (
                      <EuiAccordion
                        id={`${step.synthetics.step.name}_stack`}
                        buttonContent="Stack trace"
                      >
                        <EuiCode style={{ whiteSpace: 'pre-wrap' }} language="html">
                          {step.synthetics.payload.error.stack}
                        </EuiCode>
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
};
