/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import { MlTooltipComponent } from '../../../components/chart_tooltip';
import { TimeseriesChart } from './timeseries_chart';
import type { CombinedJob } from '../../../../../common/types/anomaly_detection_jobs';
import { ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE } from '../../../../../common/constants/search';
import type { Annotation } from '../../../../../common/types/annotations';
import { useMlKibana, useNotifications } from '../../../contexts/kibana';
import { useTimeBucketsService } from '../../../util/time_buckets_service';
import { getControlsForDetector } from '../../get_controls_for_detector';
import { MlAnnotationUpdatesContext } from '../../../contexts/ml/ml_annotation_updates_context';
import type { SourceIndicesWithGeoFields } from '../../../explorer/explorer_utils';
interface TimeSeriesChartWithTooltipsProps {
  bounds: any;
  detectorIndex: number;
  embeddableMode?: boolean;
  renderFocusChartOnly: boolean;
  selectedJob: CombinedJob;
  selectedEntities: Record<string, any>;
  showAnnotations: boolean;
  showForecast: boolean;
  showModelBounds: boolean;
  chartProps: any;
  lastRefresh: number;
  contextAggregationInterval: any;
  tableData?: {
    anomalies: MlAnomaliesTableRecord[];
    interval: string;
  };
  sourceIndicesWithGeoFields: SourceIndicesWithGeoFields;
}
export const TimeSeriesChartWithTooltips: FC<TimeSeriesChartWithTooltipsProps> = ({
  bounds,
  detectorIndex,
  embeddableMode,
  renderFocusChartOnly,
  selectedJob,
  selectedEntities,
  showAnnotations,
  showForecast,
  showModelBounds,
  chartProps,
  lastRefresh,
  contextAggregationInterval,
  tableData = {
    anomalies: [],
    interval: 'second',
  },
  sourceIndicesWithGeoFields,
}) => {
  const { toasts: toastNotifications } = useNotifications();
  const {
    services: {
      mlServices: { mlApi },
    },
  } = useMlKibana();

  const annotationUpdatesService = useContext(MlAnnotationUpdatesContext);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mlTimeBucketsService = useTimeBucketsService();

  useEffect(() => {
    let unmounted = false;
    const entities = getControlsForDetector(detectorIndex, selectedEntities, selectedJob);
    const nonBlankEntities = Array.isArray(entities)
      ? entities.filter((entity) => entity.fieldValue !== null)
      : undefined;
    const searchBounds = mlTimeBucketsService.getBoundsRoundedToInterval(
      bounds,
      contextAggregationInterval,
      false
    );

    /**
     * Loads the full list of annotations for job without any aggs or time boundaries
     * used to indicate existence of annotations that are beyond the selected time
     * in the time series brush area
     */
    const loadAnnotations = async (jobId: string) => {
      try {
        const resp = await mlApi.annotations.getAnnotations({
          jobIds: [jobId],
          earliestMs: searchBounds.min.valueOf(),
          latestMs: searchBounds.max.valueOf(),
          maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
          detectorIndex,
          entities: nonBlankEntities,
        });
        if (!unmounted) {
          if (Array.isArray(resp.annotations[jobId])) {
            setAnnotationData(resp.annotations[jobId]);
          }
        }
      } catch (error) {
        showAnnotationErrorToastNotification(error);
      }
    };

    loadAnnotations(selectedJob.job_id);

    return () => {
      unmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedJob.job_id,
    detectorIndex,
    lastRefresh,
    selectedEntities,
    bounds,
    contextAggregationInterval,
  ]);

  if (chartProps.svgHeight) {
    // 32 accounts for the height of the chart title
    chartProps.svgHeight -= 32;
  }

  return (
    <div className="ml-timeseries-chart" data-test-subj="mlSingleMetricViewerChart">
      <MlTooltipComponent>
        {(tooltipService) => (
          <TimeseriesChart
            {...chartProps}
            annotationUpdatesService={annotationUpdatesService}
            annotationData={annotationData}
            bounds={bounds}
            detectorIndex={detectorIndex}
            embeddableMode={embeddableMode}
            renderFocusChartOnly={renderFocusChartOnly}
            selectedJob={selectedJob}
            showAnnotations={showAnnotations}
            showForecast={showForecast}
            showModelBounds={showModelBounds}
            tooltipService={tooltipService}
            tableData={tableData}
            sourceIndicesWithGeoFields={sourceIndicesWithGeoFields}
          />
        )}
      </MlTooltipComponent>
    </div>
  );
};
