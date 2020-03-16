/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { TypeOf } from '@kbn/config-schema';
import { APICaller } from 'kibana/server';
import { analysisConfigSchema } from '../../routes/schemas/anomaly_detectors_schema';
import { fieldsServiceProvider } from '../fields_service';

interface ModelMemoryEstimationResult {
  modelMemoryLimit: string;
  estimatedModelMemoryLimit: string;
}

interface ModelMemoryEstimate {
  model_memory_estimate: string;
}

export function calculateModelMemoryLimitProvider(callAsCurrentUser: APICaller) {
  const fieldsService = fieldsServiceProvider(callAsCurrentUser);

  /**
   * Retrieves an estimated size of the model memory limit used in the job config
   * based on the cardinality of the fields being used to split the data
   * and influencers.
   */
  return async function calculateModelMemoryLimit(
    analysisConfig: TypeOf<typeof analysisConfigSchema>,
    indexPattern: string,
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    allowMMLGreaterThanMax = false
  ): Promise<ModelMemoryEstimationResult> {
    const limits: { max_model_memory_limit?: string } = {};
    try {
      const resp = await callAsCurrentUser('ml.info');
      if (resp?.limits?.max_model_memory_limit !== undefined) {
        limits.max_model_memory_limit = resp.limits.max_model_memory_limit.toUpperCase();
      }
    } catch (e) {
      throw new Error('Unable to retrieve max model memory limit');
    }

    let overallCardinality = {};
    let maxBucketCardinality = {};
    try {
      const { influencers, detectors } = analysisConfig;

      const overallCardinalityFields: Set<string> = detectors.reduce(
        (
          acc,
          {
            by_field_name: baseFieldName,
            partition_field_name: partitionFieldName,
            over_field_name: overFieldName,
          }
        ) => {
          [baseFieldName, partitionFieldName, overFieldName]
            .filter(field => !!field !== undefined && field !== '')
            .forEach(key => {
              acc.add(key as string);
            });
          return acc;
        },
        new Set<string>()
      );

      const maxBucketFieldCardinalities: string[] = influencers.filter(
        influencerField =>
          typeof influencerField === 'string' &&
          !!influencerField &&
          !overallCardinalityFields.has(influencerField)
      ) as string[];

      if (overallCardinalityFields.size > 0) {
        overallCardinality = await fieldsService.getCardinalityOfFields(
          indexPattern,
          [...overallCardinalityFields],
          query,
          timeFieldName,
          earliestMs,
          latestMs
        );
      }

      if (maxBucketFieldCardinalities.length > 0) {
        maxBucketCardinality = await fieldsService.getCardinalityOfFields(
          indexPattern,
          maxBucketFieldCardinalities,
          query,
          timeFieldName,
          earliestMs,
          latestMs
        );
      }
    } catch (e) {
      throw new Error('Unable to retrieve cardinality of the partition fields or the influencers');
    }

    try {
      const estimatedModelMemoryLimit = (
        await callAsCurrentUser<ModelMemoryEstimate>('ml.estimateModelMemory', {
          body: {
            analysis_config: analysisConfig,
            overall_cardinality: overallCardinality,
            max_bucket_cardinality: maxBucketCardinality,
          },
        })
      ).model_memory_estimate.toUpperCase();

      let modelMemoryLimit: string = estimatedModelMemoryLimit;
      // if max_model_memory_limit has been set,
      // make sure the estimated value is not greater than it.
      if (!allowMMLGreaterThanMax && limits.max_model_memory_limit !== undefined) {
        // @ts-ignore
        const maxBytes = numeral(limits.max_model_memory_limit).value();
        // @ts-ignore
        const mmlBytes = numeral(estimatedModelMemoryLimit).value();
        if (mmlBytes > maxBytes) {
          // @ts-ignore
          modelMemoryLimit = `${Math.floor(maxBytes / numeral('1MB').value())}MB`;
        }
      }

      return {
        estimatedModelMemoryLimit,
        modelMemoryLimit,
      };
    } catch (e) {
      throw new Error('Unable to retrieve model memory estimation');
    }
  };
}
