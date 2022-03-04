/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { EuiTourStep, EuiLink, EuiText } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { isStep2Open, STEPS_TOTAL } from './helpers';
import * as i18n from './translations';

interface EuiTheme {
  eui: {
    euiZLevel1: number;
  };
}

const ChartSelectTourComponent = ({
  children,
  setTourStep2Completed,
  showRiskChart,
  showTrendChart,
  tourStep1Completed,
  tourStep2Completed,
}: {
  children: React.ReactElement;
  setTourStep2Completed: (value: boolean) => void;
  showRiskChart: boolean;
  showTrendChart: boolean;
  tourStep1Completed: boolean;
  tourStep2Completed: boolean;
}) => {
  const showChartsToggle = useIsExperimentalFeatureEnabled('showChartsToggle'); // feature flag
  const theme = useTheme() as EuiTheme;
  const [hiddenForPositoning, setHiddenForPositoning] = useState<boolean>(false);

  const onStepCompleted = useCallback(() => {
    setTourStep2Completed(true);
  }, [setTourStep2Completed]);

  const content = useMemo(
    () => (
      <EuiText data-test-subj="contentText" size="m" style={{ width: 302 }}>
        {i18n.SELECT_A_VIEW}
      </EuiText>
    ),
    []
  );

  const footerAction = useMemo(
    () => <EuiLink onClick={onStepCompleted}>{i18n.END_TOUR}</EuiLink>,
    [onStepCompleted]
  );

  // We need to briefly hide, then show the tour step when view selection
  // changes to force re-positioning, because the size of the button changes
  useEffect(() => {
    if (
      isStep2Open({
        tourStep1Completed,
        tourStep2Completed,
      })
    ) {
      setHiddenForPositoning(true); // hide the tour step
      setTimeout(() => setHiddenForPositoning(false), 0); // show the tour step on the next tick
    }
  }, [showRiskChart, showTrendChart, tourStep1Completed, tourStep2Completed]);

  return (
    <EuiTourStep
      anchorPosition="leftUp"
      content={content}
      data-test-subj="chartSelectTourStep"
      footerAction={footerAction}
      isStepOpen={
        !hiddenForPositoning &&
        isStep2Open({
          tourStep1Completed: showChartsToggle ? tourStep1Completed : true,
          tourStep2Completed,
        })
      }
      minWidth={300}
      onFinish={noop}
      step={showChartsToggle ? 2 : 1}
      stepsTotal={showChartsToggle ? STEPS_TOTAL : 1}
      subtitle={i18n.SUBTITLE}
      title={showChartsToggle ? i18n.STEP_2_TITLE : undefined}
      zIndex={theme.eui.euiZLevel1 - 1} // put the popover behind any modals that happen to be open
    >
      {children}
    </EuiTourStep>
  );
};

ChartSelectTourComponent.displayName = 'ChartSelectTourComponent';
export const ChartSelectTour = React.memo(ChartSelectTourComponent);
