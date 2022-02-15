/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { DataVisualizer } from '../data_visualizer';

import { validateJobObject } from './validate_job_object';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import { Detector } from '../../../common/types/anomaly_detection_jobs';
import { MessageId, JobValidationMessage } from '../../../common/constants/messages';
import { isValidAggregationField } from '../../../common/util/validation_utils';
import { getDatafeedAggregations } from '../../../common/util/datafeed_utils';

function isValidCategorizationConfig(job: CombinedJob, fieldName: string): boolean {
  return (
    typeof job.analysis_config.categorization_field_name !== 'undefined' &&
    fieldName === 'mlcategory'
  );
}

function isScriptField(job: CombinedJob, fieldName: string): boolean {
  const scriptFields = Object.keys(job.datafeed_config.script_fields ?? {});
  return scriptFields.includes(fieldName);
}

function isRuntimeMapping(job: CombinedJob, fieldName: string): boolean {
  const runtimeMappings = Object.keys(job.datafeed_config.runtime_mappings ?? {});
  return runtimeMappings.includes(fieldName);
}

// Thresholds to determine whether cardinality is
// too high or low for certain fields analysis
const OVER_FIELD_CARDINALITY_THRESHOLD_LOW = 10;
const OVER_FIELD_CARDINALITY_THRESHOLD_HIGH = 1000000;
const PARTITION_FIELD_CARDINALITY_THRESHOLD = 1000;
const BY_FIELD_CARDINALITY_THRESHOLD = 1000;
const MODEL_PLOT_THRESHOLD_HIGH = 100;

export type Messages = JobValidationMessage[];

type Validator = (obj: {
  type: string;
  isInvalid: (cardinality: number) => boolean;
  messageId?: MessageId;
}) => Promise<{
  modelPlotCardinality: number;
  messages: Messages;
}>;

const validateFactory = (client: IScopedClusterClient, job: CombinedJob): Validator => {
  const { asCurrentUser } = client;
  const dv = new DataVisualizer(client);

  const modelPlotConfigTerms = job?.model_plot_config?.terms ?? '';
  const modelPlotConfigFieldCount =
    modelPlotConfigTerms.length > 0 ? modelPlotConfigTerms.split(',').length : 0;

  return async ({ type, isInvalid, messageId }) => {
    // modelPlotCardinality counts the cardinality of fields used within detectors.
    // if model_plot_config.terms is used, it doesn't count the real cardinality of the field
    // but adds only the count of fields used in model_plot_config.terms
    let modelPlotCardinality = 0;
    const messages: Messages = [];
    const fieldName = `${type}_field_name` as keyof Pick<
      Detector,
      'by_field_name' | 'over_field_name' | 'partition_field_name'
    >;

    const detectors = job.analysis_config.detectors;
    const relevantDetectors = detectors.filter((detector) => {
      return typeof detector[fieldName] !== 'undefined';
    });
    const datafeedConfig = job.datafeed_config;

    if (relevantDetectors.length > 0) {
      try {
        const uniqueFieldNames = [
          ...new Set(relevantDetectors.map((f) => f[fieldName])),
        ] as string[];

        // use fieldCaps endpoint to get data about whether fields are aggregatable
        const fieldCaps = await asCurrentUser.fieldCaps({
          index: job.datafeed_config.indices.join(','),
          fields: uniqueFieldNames,
        });
        const datafeedAggregations = getDatafeedAggregations(datafeedConfig);

        let aggregatableFieldNames: string[] = [];
        // parse fieldCaps to return an array of just the fields which are aggregatable
        if (typeof fieldCaps === 'object' && typeof fieldCaps.fields === 'object') {
          aggregatableFieldNames = uniqueFieldNames.filter((field) => {
            if (
              typeof datafeedConfig?.script_fields === 'object' &&
              datafeedConfig?.script_fields.hasOwnProperty(field)
            ) {
              return true;
            }
            if (
              typeof datafeedConfig?.runtime_mappings === 'object' &&
              datafeedConfig?.runtime_mappings.hasOwnProperty(field)
            ) {
              return true;
            }

            // if datafeed has aggregation fields, check recursively if field exist
            if (
              datafeedAggregations !== undefined &&
              isValidAggregationField(datafeedAggregations, field)
            ) {
              return true;
            }

            if (typeof fieldCaps.fields[field] !== 'undefined') {
              const fieldType = Object.keys(fieldCaps.fields[field])[0];
              return fieldCaps.fields[field][fieldType].aggregatable;
            }
            return false;
          });
        }

        const stats = await dv.checkAggregatableFieldsExist(
          job.datafeed_config.indices.join(','),
          job.datafeed_config.query,
          aggregatableFieldNames,
          0,
          job.data_description.time_field,
          undefined,
          undefined,
          datafeedConfig
        );

        if (stats.totalCount === 0) {
          messages.push({
            id: 'cardinality_no_results',
          });
        } else {
          uniqueFieldNames.forEach((uniqueFieldName) => {
            const aggregatableNotExistsField = stats.aggregatableNotExistsFields.find(
              (fieldData) => fieldData.fieldName === uniqueFieldName
            );

            if (aggregatableNotExistsField !== undefined) {
              messages.push({
                id: 'cardinality_field_not_exists',
                fieldName: uniqueFieldName,
              });
            } else {
              const field = stats.aggregatableExistsFields.find(
                (fieldData) => fieldData.fieldName === uniqueFieldName
              );
              if (field !== undefined && typeof field === 'object' && field.stats) {
                modelPlotCardinality +=
                  modelPlotConfigFieldCount > 0
                    ? modelPlotConfigFieldCount
                    : field.stats.cardinality!;

                if (isInvalid(field.stats.cardinality!)) {
                  messages.push({
                    id: messageId || (`cardinality_${type}_field` as MessageId),
                    fieldName: uniqueFieldName,
                  });
                }
              } else {
                // only report uniqueFieldName as not aggregatable if it's not part
                // of a valid categorization configuration and if it's not a scripted field or runtime field.
                if (
                  !isValidCategorizationConfig(job, uniqueFieldName) &&
                  !isScriptField(job, uniqueFieldName) &&
                  !isRuntimeMapping(job, uniqueFieldName)
                ) {
                  messages.push({
                    id: 'field_not_aggregatable',
                    fieldName: uniqueFieldName,
                  });
                }
              }
            }
          });
        }
      } catch (e) {
        // checkAggregatableFieldsExist may return an error if 'fielddata' is
        // disabled for text fields (which is the default). If there was only
        // one field we know it was the cause for the error. If there were more
        // fields we cannot tell which field caused the error so we return a
        // more generic message.
        if (relevantDetectors.length === 1) {
          messages.push({
            id: 'field_not_aggregatable',
            fieldName: relevantDetectors[0][fieldName]!,
          });
        } else {
          messages.push({ id: 'fields_not_aggregatable' });
        }
        // return here so an outer try/catch doesn't trigger to avoid a BOOM error
        return { modelPlotCardinality, messages };
      }
    }

    return { modelPlotCardinality, messages };
  };
};

export async function validateCardinality(
  client: IScopedClusterClient,
  job?: CombinedJob
): Promise<Messages> | never {
  const messages: Messages = [];

  if (!validateJobObject(job)) {
    // required for TS type casting, validateJobObject throws an error internally.
    throw new Error();
  }

  // find out if there are any relevant detector field names
  // where cardinality checks could be run against.
  const numDetectorsWithFieldNames = job.analysis_config.detectors.filter((d) => {
    return d.by_field_name || d.over_field_name || d.partition_field_name;
  });
  if (numDetectorsWithFieldNames.length === 0) {
    return [];
  }

  // validate({ type, isInvalid }) asynchronously returns an array of validation messages
  const validate = validateFactory(client, job);

  const modelPlotEnabled = job.model_plot_config?.enabled ?? false;

  // check over fields (population analysis)
  const validateOverFieldsLow = validate({
    type: 'over',
    isInvalid: (cardinality) => cardinality < OVER_FIELD_CARDINALITY_THRESHOLD_LOW,
    messageId: 'cardinality_over_field_low',
  });
  const validateOverFieldsHigh = validate({
    type: 'over',
    isInvalid: (cardinality) => cardinality > OVER_FIELD_CARDINALITY_THRESHOLD_HIGH,
    messageId: 'cardinality_over_field_high',
  });

  // check partition/by fields (multi-metric analysis)
  const validatePartitionFields = validate({
    type: 'partition',
    isInvalid: (cardinality) => cardinality > PARTITION_FIELD_CARDINALITY_THRESHOLD,
  });
  const validateByFields = validate({
    type: 'by',
    isInvalid: (cardinality) => cardinality > BY_FIELD_CARDINALITY_THRESHOLD,
  });

  // we already called the validation functions above,
  // but add "await" only here so they can be run in parallel.
  const validations = [
    await validateByFields,
    await validateOverFieldsLow,
    await validateOverFieldsHigh,
    await validatePartitionFields,
  ];

  // if model plot is enabled, check against the
  // overall cardinality of all fields used in the detectors.
  const modelPlotCardinality = validations.reduce((p, c) => {
    return p + c.modelPlotCardinality;
  }, 0);

  if (modelPlotEnabled && modelPlotCardinality > MODEL_PLOT_THRESHOLD_HIGH) {
    messages.push({
      id: 'cardinality_model_plot_high',
      modelPlotCardinality,
    });
  }

  // add all messages returned from the individual cardinality checks
  validations.forEach((v) => messages.push(...v.messages));

  if (messages.length === 0) {
    messages.push({ id: 'success_cardinality' });
  }

  return messages;
}
