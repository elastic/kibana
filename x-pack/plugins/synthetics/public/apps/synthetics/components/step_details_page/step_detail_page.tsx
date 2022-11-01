/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { WaterfallChartContainer } from './components/network_waterfall/step_detail/waterfall/waterfall_chart_container';
import { StepImage } from './components/step_image';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';
import { MonitorDetailsLinkPortal } from '../monitor_add_edit/monitor_details_portal';
import { useStepDetailsBreadcrumbs } from './hooks/use_step_details_breadcrumbs';

export const StepDetailPage = () => {
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  useTrackPageview({ app: 'synthetics', path: 'stepDetail' });
  useTrackPageview({ app: 'synthetics', path: 'stepDetail', delay: 15000 });

  const { data, loading, isFailed, currentStep, stepLabels } = useJourneySteps(checkGroupId);

  const activeStep = data?.steps?.find(
    (step) => step.synthetics?.step?.index === Number(stepIndex)
  );

  useStepDetailsBreadcrumbs([{ text: data?.details?.journey.monitor.name ?? '' }]);

  if (loading) {
    return (
      <div className="eui-textCenter">
        <EuiLoadingSpinner size="xxl" />
      </div>
    );
  }

  return (
    <>
      {data?.details?.journey && (
        <MonitorDetailsLinkPortal
          id={data.details.journey.monitor.id}
          name={data.details.journey.monitor.name!}
        />
      )}
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiPanel>
            {data?.details?.journey && currentStep && (
              <StepImage
                ping={data?.details?.journey}
                step={currentStep}
                isFailed={isFailed}
                stepLabels={stepLabels}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                {/* TODO: Add breakdown of network timings donut*/}
              </EuiFlexItem>
              <EuiFlexItem grow={2} css={{ height: 150 }}>
                {/* TODO: Add breakdown of network events*/}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiPanel>{/* TODO: Add step metrics*/} </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem grow={1} css={{ height: 150 }}>
                {/* TODO: Add breakdown of object list*/}
              </EuiFlexItem>
              <EuiFlexItem grow={1}>{/* TODO: Add breakdown of object weight*/}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      {data && (
        <div>
          <WaterfallChartContainer
            checkGroup={checkGroupId}
            stepIndex={Number(stepIndex)}
            activeStep={activeStep}
          />
        </div>
      )}
    </>
  );
};
