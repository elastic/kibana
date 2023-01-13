/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { BreakdownLegend } from './step_timing_breakdown/breakdown_legend';
import { WaterfallChartContainer } from './step_waterfall_chart/waterfall/waterfall_chart_container';
import { ObjectWeightList } from './step_objects/object_weight_list';
import { NetworkTimingsDonut } from './step_timing_breakdown/network_timings_donut';
import { StepMetrics } from './step_metrics/step_metrics';
import { NetworkTimingsBreakdown } from './network_timings_breakdown';
import { ObjectCountList } from './step_objects/object_count_list';
import { StepImage } from './step_screenshot/step_image';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';
import { MonitorDetailsLinkPortal } from '../monitor_add_edit/monitor_details_portal';

import { useStepDetailsBreadcrumbs } from './hooks/use_step_details_breadcrumbs';

export const StepDetailPage = () => {
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  useTrackPageview({ app: 'synthetics', path: 'stepDetail' });
  useTrackPageview({ app: 'synthetics', path: 'stepDetail', delay: 15000 });

  const { data, loading, isFailed, currentStep } = useJourneySteps(checkGroupId);

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
      {data?.details?.journey?.config_id && (
        <MonitorDetailsLinkPortal
          configId={data.details.journey.config_id}
          name={data.details.journey.monitor.name!}
        />
      )}
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={1}>
          <EuiPanel hasShadow={false} hasBorder>
            {data?.details?.journey && currentStep && (
              <StepImage ping={data?.details?.journey} step={currentStep} isFailed={isFailed} />
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                <NetworkTimingsDonut />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <BreakdownLegend />
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <NetworkTimingsBreakdown monitorId={data?.details?.journey.monitor.id!} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={1}>
          <EuiPanel hasShadow={false} hasBorder>
            <StepMetrics />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                <ObjectWeightList />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <ObjectCountList />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {data && (
        <WaterfallChartContainer
          checkGroup={checkGroupId}
          stepIndex={Number(stepIndex)}
          activeStep={activeStep}
        />
      )}
    </>
  );
};
