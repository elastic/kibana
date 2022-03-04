/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { EuiButton, EuiLink, EuiSpacer, EuiText, EuiTourStep } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';

import { isStep1Open, STEPS_TOTAL } from './helpers';
import * as i18n from './translations';

const DELAY = 1000 * 4;

interface EuiTheme {
  eui: {
    euiZLevel1: number;
  };
}

const ViewChartToggleTourComponent = ({
  children,
  setTourStep1Completed,
  setTourStep2Completed,
  tourStep1Completed,
}: {
  children: React.ReactElement;
  setTourStep1Completed: (value: boolean) => void;
  setTourStep2Completed: (value: boolean) => void;
  tourStep1Completed: boolean;
}) => {
  const [delayElapsed, setDelayElapsed] = useState(false);
  const theme = useTheme() as EuiTheme;

  const onStepCompleted = useCallback(() => {
    setTourStep1Completed(true);
  }, [setTourStep1Completed]);

  const onSkipTour = useCallback(() => {
    setTourStep2Completed(true);
    setTourStep1Completed(true);
  }, [setTourStep1Completed, setTourStep2Completed]);

  const content = useMemo(
    () => (
      <>
        <EuiText data-test-subj="contentText" size="m" style={{ width: 302 }}>
          {i18n.CLICK_TO_HIDE_OR_SHOW_CHART}
        </EuiText>
        <EuiSpacer />
        <EuiButton onClick={onStepCompleted}>{i18n.GOT_IT}</EuiButton>
      </>
    ),
    [onStepCompleted]
  );

  const footerAction = useMemo(
    () => <EuiLink onClick={onSkipTour}>{i18n.SKIP_TOUR}</EuiLink>,
    [onSkipTour]
  );

  useEffect(() => {
    setTimeout(() => setDelayElapsed(true), DELAY);
  }, []);

  return (
    <EuiTourStep
      anchorPosition="leftUp"
      content={content}
      data-test-subj="viewChartToggleTourStep"
      footerAction={footerAction}
      isStepOpen={isStep1Open({ delayElapsed, tourStep1Completed })}
      minWidth={300}
      onFinish={noop}
      step={1}
      stepsTotal={STEPS_TOTAL}
      title={i18n.STEP_1_TITLE}
      subtitle={i18n.SUBTITLE}
      zIndex={theme.eui.euiZLevel1 - 1} // put the popover behind any modals that happen to be open
    >
      {children}
    </EuiTourStep>
  );
};

ViewChartToggleTourComponent.displayName = 'ViewChartToggleTourComponent';
export const ViewChartToggleTour = React.memo(ViewChartToggleTourComponent);
