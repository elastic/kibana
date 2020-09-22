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
  EuiCodeBlock,
} from '@elastic/eui';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntersection } from 'react-use';
import { Ping } from '../../../../common/runtime_types';
import { UptimeThemeContext } from '../../../contexts';
import { getJourneySteps, getStepScreenshot } from '../../../state/actions/journey';
import { journeySelector } from '../../../state/selectors';

interface ScreenshotDisplayProps {
  isLoading: boolean;
  screenshot: string;
  stepIndex: number;
  fetchScreenshot: (stepIndex: number) => void;
}

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;

const ScreenshotDisplay: React.FC<ScreenshotDisplayProps> = (props) => {
  const imgRef = useRef(null);

  const {
    colors: { lightestShade: pageBackground },
  } = useContext(UptimeThemeContext);
  return (
    <div
      ref={imgRef}
      style={{ backgroundColor: pageBackground, height: THUMBNAIL_HEIGHT, width: THUMBNAIL_WIDTH }}
    >
      <ScreenshotDisplayContent {...props} imgRef={imgRef} />
    </div>
  );
};

type ScreenshotDisplayContentProps = ScreenshotDisplayProps & {
  imgRef: React.MutableRefObject<any>;
};

const ScreenshotDisplayContent: React.FC<ScreenshotDisplayContentProps> = ({
  isLoading,
  screenshot,
  stepIndex,
  fetchScreenshot,
  imgRef,
}) => {
  const intersection = useIntersection(imgRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });
  useEffect(() => {
    if (screenshot === undefined && intersection && intersection.isIntersecting) {
      fetchScreenshot(stepIndex);
    }
  }, [fetchScreenshot, intersection, screenshot, stepIndex]);
  console.log('int:', intersection);
  // need to render container for intersection ref
  if (screenshot) {
    return (
      <img
        ref={imgRef}
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
  } else if (isLoading === false && screenshot === '') {
    return (
      <EuiFlexGroup alignItems="center" direction="column" style={{ paddingTop: '32px' }}>
        <EuiFlexItem grow={false}>
          <EuiIcon color="subdued" size="xxl" type="image" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong>No image available</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }
  return null;
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

const CODE_BLOCK_OVERFLOW_HEIGHT = 360;

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
};
