/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { mlJobService } from '../../../services/job_service';
import { getFunctionDescription, isMetricDetector } from '../../get_function_description';
import { useToastNotificationService } from '../../../services/toast_notification_service';
import { ML_JOB_AGGREGATION } from '../../../../../common/constants/aggregation_types';
import type { CombinedJob } from '../../../../../common/types/anomaly_detection_jobs';

const plotByFunctionOptions = [
  {
    value: 'mean',
    text: i18n.translate('xpack.ml.timeSeriesExplorer.plotByAvgOptionLabel', {
      defaultMessage: 'mean',
    }),
  },
  {
    value: 'min',
    text: i18n.translate('xpack.ml.timeSeriesExplorer.plotByMinOptionLabel', {
      defaultMessage: 'min',
    }),
  },
  {
    value: 'max',
    text: i18n.translate('xpack.ml.timeSeriesExplorer.plotByMaxOptionLabel', {
      defaultMessage: 'max',
    }),
  },
];
export const PlotByFunctionControls = ({
  functionDescription,
  setFunctionDescription,
  selectedDetectorIndex,
  selectedJobId,
  selectedEntities,
  entityControlsCount,
}: {
  functionDescription: undefined | string;
  setFunctionDescription: (func: string) => void;
  selectedDetectorIndex: number;
  selectedJobId: string;
  selectedEntities: Record<string, any>;
  entityControlsCount: number;
}) => {
  const toastNotificationService = useToastNotificationService();

  const getFunctionDescriptionToPlot = useCallback(
    async (
      _selectedDetectorIndex: number,
      _selectedEntities: Record<string, any>,
      _selectedJobId: string,
      _selectedJob: CombinedJob
    ) => {
      const functionToPlot = await getFunctionDescription(
        {
          selectedDetectorIndex: _selectedDetectorIndex,
          selectedEntities: _selectedEntities,
          selectedJobId: _selectedJobId,
          selectedJob: _selectedJob,
        },
        toastNotificationService
      );
      setFunctionDescription(functionToPlot);
    },
    [setFunctionDescription, toastNotificationService]
  );

  useEffect(() => {
    if (functionDescription !== undefined) {
      return;
    }
    const selectedJob = mlJobService.getJob(selectedJobId);
    // if no controls, it's okay to fetch
    // if there are series controls, only fetch if user has selected something
    const validEntities =
      entityControlsCount === 0 || (entityControlsCount > 0 && selectedEntities !== undefined);
    if (
      validEntities &&
      functionDescription === undefined &&
      isMetricDetector(selectedJob, selectedDetectorIndex)
    ) {
      const detector = selectedJob.analysis_config.detectors[selectedDetectorIndex];
      if (detector?.function === ML_JOB_AGGREGATION.METRIC) {
        getFunctionDescriptionToPlot(
          selectedDetectorIndex,
          selectedEntities,
          selectedJobId,
          selectedJob
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    setFunctionDescription,
    selectedDetectorIndex,
    selectedEntities,
    selectedJobId,
    functionDescription,
    entityControlsCount,
  ]);

  if (functionDescription === undefined) return null;

  return (
    <EuiFlexItem grow={false}>
      <EuiFormRow
        label={i18n.translate('xpack.ml.timeSeriesExplorer.metricPlotByOption', {
          defaultMessage: 'Function',
        })}
      >
        <EuiSelect
          options={plotByFunctionOptions}
          value={functionDescription}
          onChange={(e) => setFunctionDescription(e.target.value)}
          aria-label={i18n.translate('xpack.ml.timeSeriesExplorer.metricPlotByOptionLabel', {
            defaultMessage: 'Pick function to plot by (min, max, or average) if metric function',
          })}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
