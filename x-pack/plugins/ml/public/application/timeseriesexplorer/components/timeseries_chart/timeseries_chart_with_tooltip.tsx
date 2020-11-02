/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { MlTooltipComponent } from '../../../components/chart_tooltip';
import { TimeseriesChart } from './timeseries_chart';
import { CombinedJob } from '../../../../../common/types/anomaly_detection_jobs';
import { ml } from '../../../services/ml_api_service';
import { ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE } from '../../../../../common/constants/search';
import { extractErrorMessage } from '../../../../../common/util/errors';
import { Annotation } from '../../../../../common/types/annotations';
import { useNotifications } from '../../../contexts/kibana';

interface TimeSeriesChartWithTooltipsProps {
  bounds: any;
  selectedDetectorIndex: number;
  renderFocusChartOnly: boolean;
  selectedJob: CombinedJob;
  showAnnotations: boolean;
  showForecast: boolean;
  showModelBounds: boolean;
  chartProps: any;
  lastRefresh: number;
}
export const TimeSeriesChartWithTooltips: FC<TimeSeriesChartWithTooltipsProps> = ({
  bounds,
  selectedDetectorIndex,
  renderFocusChartOnly,
  selectedJob,
  showAnnotations,
  showForecast,
  showModelBounds,
  chartProps,
  lastRefresh,
}) => {
  const { toasts: toastNotifications } = useNotifications();

  const [annotationData, setAnnotationData] = useState<Annotation[]>([]);

  const showAnnotationErrorToastNotification = useCallback((error?: string) => {
    toastNotifications.addDanger({
      title: i18n.translate(
        'xpack.ml.timeSeriesExplorer.mlSingleMetricViewerChart.annotationsErrorTitle',
        {
          defaultMessage: 'An error occurred fetching annotations',
        }
      ),
      ...(error ? { text: extractErrorMessage(error) } : {}),
    });
  }, []);

  useEffect(() => {
    let unmounted = false;
    /**
     * Loads the full list of annotations for job without any aggs or time boundaries
     * used to indicate existence of annotations that are beyond the selected time
     * in the time series brush area
     */
    const loadAnnotations = async (jobId: string) => {
      try {
        const resp = await ml.annotations.getAnnotations({
          jobIds: [jobId],
          earliestMs: null,
          latestMs: null,
          maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
        });
        if (!unmounted) {
          if (Array.isArray(resp.annotations[jobId])) {
            setAnnotationData(resp.annotations[jobId]);
          } else {
            showAnnotationErrorToastNotification();
          }
        }
      } catch (error) {
        showAnnotationErrorToastNotification(error);
      }
    };

    loadAnnotations(selectedJob.job_id);

    return () => {
      unmounted = false;
    };
  }, [selectedJob.job_id, selectedDetectorIndex, lastRefresh]);

  return (
    <div className="ml-timeseries-chart" data-test-subj="mlSingleMetricViewerChart">
      <MlTooltipComponent>
        {(tooltipService) => (
          <TimeseriesChart
            {...chartProps}
            annotationData={annotationData}
            bounds={bounds}
            detectorIndex={selectedDetectorIndex}
            renderFocusChartOnly={renderFocusChartOnly}
            selectedJob={selectedJob}
            showAnnotations={showAnnotations}
            showForecast={showForecast}
            showModelBounds={showModelBounds}
            tooltipService={tooltipService}
          />
        )}
      </MlTooltipComponent>
    </div>
  );
};
