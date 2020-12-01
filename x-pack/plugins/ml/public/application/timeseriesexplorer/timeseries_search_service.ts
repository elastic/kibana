/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { each, find, get, filter } from 'lodash';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ml } from '../services/ml_api_service';
import {
  isModelPlotChartableForDetector,
  isModelPlotEnabled,
} from '../../../common/util/job_utils';
// @ts-ignore
import { buildConfigFromDetector } from '../util/chart_config_builder';
import { mlResultsService } from '../services/results_service';
import { ModelPlotOutput } from '../services/results_service/result_service_rx';
import { Job } from '../../../common/types/anomaly_detection_jobs';
import { EntityField } from '../../../common/util/anomaly_utils';

function getMetricData(
  job: Job,
  detectorIndex: number,
  entityFields: EntityField[],
  earliestMs: number,
  latestMs: number,
  intervalMs: number,
  esMetricFunction?: string
): Observable<ModelPlotOutput> {
  if (
    isModelPlotChartableForDetector(job, detectorIndex) &&
    isModelPlotEnabled(job, detectorIndex, entityFields)
  ) {
    // Extract the partition, by, over fields on which to filter.
    const criteriaFields = [];
    const detector = job.analysis_config.detectors[detectorIndex];
    if (detector.partition_field_name !== undefined) {
      const partitionEntity: any = find(entityFields, {
        fieldName: detector.partition_field_name,
      });
      if (partitionEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'partition_field_name', fieldValue: partitionEntity.fieldName },
          { fieldName: 'partition_field_value', fieldValue: partitionEntity.fieldValue }
        );
      }
    }

    if (detector.over_field_name !== undefined) {
      const overEntity: any = find(entityFields, { fieldName: detector.over_field_name });
      if (overEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'over_field_name', fieldValue: overEntity.fieldName },
          { fieldName: 'over_field_value', fieldValue: overEntity.fieldValue }
        );
      }
    }

    if (detector.by_field_name !== undefined) {
      const byEntity: any = find(entityFields, { fieldName: detector.by_field_name });
      if (byEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'by_field_name', fieldValue: byEntity.fieldName },
          { fieldName: 'by_field_value', fieldValue: byEntity.fieldValue }
        );
      }
    }

    return mlResultsService.getModelPlotOutput(
      job.job_id,
      detectorIndex,
      criteriaFields,
      earliestMs,
      latestMs,
      intervalMs
    );
  } else {
    const obj: ModelPlotOutput = {
      success: true,
      results: {},
    };

    const chartConfig = buildConfigFromDetector(job, detectorIndex);

    return mlResultsService
      .getMetricData(
        chartConfig.datafeedConfig.indices,
        entityFields,
        chartConfig.datafeedConfig.query,
        esMetricFunction ?? chartConfig.metricFunction,
        chartConfig.metricFieldName,
        chartConfig.timeField,
        earliestMs,
        latestMs,
        intervalMs,
        chartConfig?.datafeedConfig
      )
      .pipe(
        map((resp) => {
          each(resp.results, (value, time) => {
            // @ts-ignore
            obj.results[time] = {
              actual: value,
            };
          });
          return obj;
        })
      );
  }
}

// Builds chart detail information (charting function description and entity counts) used
// in the title area of the time series chart.
// Queries Elasticsearch if necessary to obtain the distinct count of entities
// for which data is being plotted.
function getChartDetails(
  job: Job,
  detectorIndex: number,
  entityFields: any[],
  earliestMs: number,
  latestMs: number
) {
  return new Promise((resolve, reject) => {
    const obj: any = {
      success: true,
      results: { functionLabel: '', entityData: { entities: [] } },
    };

    const chartConfig = buildConfigFromDetector(job, detectorIndex);
    let functionLabel = chartConfig.metricFunction;
    if (chartConfig.metricFieldName !== undefined) {
      functionLabel += ' ';
      functionLabel += chartConfig.metricFieldName;
    }
    obj.results.functionLabel = functionLabel;

    const blankEntityFields = filter(entityFields, (entity) => {
      return entity.fieldValue === null;
    });

    // Look to see if any of the entity fields have defined values
    // (i.e. blank input), and if so obtain the cardinality.
    if (blankEntityFields.length === 0) {
      obj.results.entityData.count = 1;
      obj.results.entityData.entities = entityFields;
      resolve(obj);
    } else {
      const entityFieldNames: string[] = blankEntityFields.map((f) => f.fieldName);
      ml.getCardinalityOfFields({
        index: chartConfig.datafeedConfig.indices,
        fieldNames: entityFieldNames,
        query: chartConfig.datafeedConfig.query,
        timeFieldName: chartConfig.timeField,
        earliestMs,
        latestMs,
      })
        .then((results: any) => {
          each(blankEntityFields, (field) => {
            // results will not contain keys for non-aggregatable fields,
            // so store as 0 to indicate over all field values.
            obj.results.entityData.entities.push({
              fieldName: field.fieldName,
              cardinality: get(results, field.fieldName, 0),
            });
          });

          resolve(obj);
        })
        .catch((resp: any) => {
          reject(resp);
        });
    }
  });
}

export const mlTimeSeriesSearchService = {
  getMetricData,
  getChartDetails,
};
