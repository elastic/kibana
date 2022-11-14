/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useTheme } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { JourneyStepScreenshotContainer } from '../common/screenshot/journey_step_screenshot_container';

export const StepScreenshotDetails = ({ stepIndex }: { stepIndex: number }) => {
  const { checkGroupId } = useParams<{ checkGroupId: string }>();

  const theme = useTheme();
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      css={{ backgroundColor: theme.eui.euiColorLightestShade }}
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <JourneyStepScreenshotContainer
            checkGroup={checkGroupId}
            initialStepNo={stepIndex}
            stepStatus={'up'}
            allStepsLoaded={true}
            stepLabels={[]}
            retryFetchOnRevisit={false}
            asThumbnail={false}
            size="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>{/* TODO: add image details*/}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
