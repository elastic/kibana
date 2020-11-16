/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { mlJobService } from '../../../services/job_service';
import { getFunctionDescription } from '../../get_function_description';
import { useToastNotificationService } from '../../../services/toast_notification_service';

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
}: {
  functionDescription: undefined | string;
  setFunctionDescription: (func: string) => void;
  selectedDetectorIndex: any;
  selectedJobId: string;
  selectedEntities: Record<string, any>;
}) => {
  const toastNotificationService = useToastNotificationService();
  const previous = useRef<string | null>(null);

  const handleOnChange = useCallback((func: string) => {
    setFunctionDescription(func);
    previous.current = func;
  }, []);

  useEffect(() => {
    const getFunctionDescriptionToPlot = async () => {
      const functionToPlot = await getFunctionDescription(
        {
          selectedDetectorIndex,
          selectedEntities,
          selectedJobId,
          selectedJob,
        },
        toastNotificationService
      );
      setFunctionDescription(functionToPlot);
    };

    const selectedJob = mlJobService.getJob(selectedJobId);
    if (
      // set if only entity controls are picked
      selectedEntities !== undefined &&
      functionDescription === undefined &&
      selectedJob.analysis_config?.detectors?.hasOwnProperty(selectedDetectorIndex)
    ) {
      const detector = selectedJob.analysis_config.detectors[selectedDetectorIndex];
      if (detector?.function === 'metric') {
        getFunctionDescriptionToPlot();
      }
    }
  }, [
    setFunctionDescription,
    selectedDetectorIndex,
    selectedEntities,
    selectedJobId,
    functionDescription,
  ]);

  if (functionDescription === undefined || functionDescription === 'unknown') return null;

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
          onChange={(e) => handleOnChange(e.target.event)}
          aria-label={i18n.translate('xpack.ml.timeSeriesExplorer.metricPlotByOptionLabel', {
            defaultMessage: 'Pick function to plot by (min, max, or average) if metric function',
          })}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
