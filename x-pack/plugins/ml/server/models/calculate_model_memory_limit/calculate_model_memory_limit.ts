/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import numeral from '@elastic/numeral';
import { IScopedClusterClient } from 'kibana/server';
import { MLCATEGORY } from '../../../common/constants/field_types';
import { AnalysisConfig, Datafeed } from '../../../common/types/anomaly_detection_jobs';
import { fieldsServiceProvider } from '../fields_service';
import type { MlClient } from '../../lib/ml_client';

export interface ModelMemoryEstimationResult {
  /**
   * Result model memory limit
   */
  modelMemoryLimit: string;
  /**
   * Estimated model memory by elasticsearch ml endpoint
   */
  estimatedModelMemoryLimit: string;
  /**
   * Maximum model memory limit
   */
  maxModelMemoryLimit?: string;
}

/**
 * Response of the _estimate_model_memory endpoint.
 */
export interface ModelMemoryEstimateResponse {
  model_memory_estimate: string;
}

/**
 * Retrieves overall and max bucket cardinalities.
 */
const cardinalityCheckProvider = (client: IScopedClusterClient) => {
  const fieldsService = fieldsServiceProvider(client);

  return async (
    analysisConfig: AnalysisConfig,
    indexPattern: string,
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    datafeedConfig?: Datafeed
  ): Promise<{
    overallCardinality: { [key: string]: number };
    maxBucketCardinality: { [key: string]: number };
  }> => {
    /**
     * Fields not involved in cardinality check
     */
    const excludedKeywords = new Set<string>(
      /**
       * The keyword which is used to mean the output of categorization,
       * so it will have cardinality zero in the actual input data.
       */
      MLCATEGORY
    );

    const { detectors, influencers, bucket_span: bucketSpan } = analysisConfig;

    let overallCardinality = {};
    let maxBucketCardinality = {};

    // Get fields required for the model memory estimation
    const overallCardinalityFields: Set<string> = detectors.reduce(
      (
        acc,
        {
          by_field_name: byFieldName,
          partition_field_name: partitionFieldName,
          over_field_name: overFieldName,
        }
      ) => {
        [byFieldName, partitionFieldName, overFieldName]
          .filter((field) => field !== undefined && field !== '' && !excludedKeywords.has(field))
          .forEach((key) => {
            acc.add(key as string);
          });
        return acc;
      },
      new Set<string>()
    );

    // @ts-expect-error influencers is optional
    const normalizedInfluencers: estypes.Field[] = Array.isArray(influencers)
      ? influencers
      : [influencers];
    const maxBucketFieldCardinalities = normalizedInfluencers.filter(
      (influencerField) =>
        !!influencerField &&
        !excludedKeywords.has(influencerField) &&
        !overallCardinalityFields.has(influencerField)
    );

    if (overallCardinalityFields.size > 0) {
      overallCardinality = await fieldsService.getCardinalityOfFields(
        indexPattern,
        [...overallCardinalityFields],
        query,
        timeFieldName,
        earliestMs,
        latestMs,
        datafeedConfig
      );
    }

    if (maxBucketFieldCardinalities.length > 0) {
      maxBucketCardinality = await fieldsService.getMaxBucketCardinalities(
        indexPattern,
        maxBucketFieldCardinalities,
        query,
        timeFieldName,
        earliestMs,
        latestMs,
        bucketSpan as string, // update to Time type
        datafeedConfig
      );
    }

    return {
      overallCardinality,
      maxBucketCardinality,
    };
  };
};

export function calculateModelMemoryLimitProvider(
  client: IScopedClusterClient,
  mlClient: MlClient
) {
  const getCardinalities = cardinalityCheckProvider(client);

  /**
   * Retrieves an estimated size of the model memory limit used in the job config
   * based on the cardinality of the fields being used to split the data
   * and influencers.
   */
  return async function calculateModelMemoryLimit(
    analysisConfig: AnalysisConfig,
    indexPattern: string,
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    allowMMLGreaterThanMax = false,
    datafeedConfig?: Datafeed
  ): Promise<ModelMemoryEstimationResult> {
    const info = await mlClient.info();
    const maxModelMemoryLimit = info.limits.max_model_memory_limit?.toUpperCase();
    const effectiveMaxModelMemoryLimit =
      info.limits.effective_max_model_memory_limit?.toUpperCase();

    const { overallCardinality, maxBucketCardinality } = await getCardinalities(
      analysisConfig,
      indexPattern,
      query,
      timeFieldName,
      earliestMs,
      latestMs,
      datafeedConfig
    );

    const body = await mlClient.estimateModelMemory({
      body: {
        analysis_config: analysisConfig,
        overall_cardinality: overallCardinality,
        max_bucket_cardinality: maxBucketCardinality,
      },
    });
    const estimatedModelMemoryLimit = body.model_memory_estimate.toUpperCase();

    let modelMemoryLimit = estimatedModelMemoryLimit;
    let mmlCappedAtMax = false;
    // if max_model_memory_limit has been set,
    // make sure the estimated value is not greater than it.
    if (allowMMLGreaterThanMax === false) {
      // @ts-expect-error numeral missing value
      const mmlBytes = numeral(estimatedModelMemoryLimit).value();
      if (maxModelMemoryLimit !== undefined) {
        // @ts-expect-error numeral missing value
        const maxBytes = numeral(maxModelMemoryLimit).value();
        if (mmlBytes > maxBytes) {
          // @ts-expect-error numeral missing value
          modelMemoryLimit = `${Math.floor(maxBytes / numeral('1MB').value())}MB`;
          mmlCappedAtMax = true;
        }
      }

      // if we've not already capped the estimated mml at the hard max server setting
      // ensure that the estimated mml isn't greater than the effective max mml
      if (mmlCappedAtMax === false && effectiveMaxModelMemoryLimit !== undefined) {
        // @ts-expect-error numeral missing value
        const effectiveMaxMmlBytes = numeral(effectiveMaxModelMemoryLimit).value();
        if (mmlBytes > effectiveMaxMmlBytes) {
          // @ts-expect-error numeral missing value
          modelMemoryLimit = `${Math.floor(effectiveMaxMmlBytes / numeral('1MB').value())}MB`;
        }
      }
    }

    return {
      estimatedModelMemoryLimit,
      modelMemoryLimit,
      ...(maxModelMemoryLimit ? { maxModelMemoryLimit } : {}),
      ...(effectiveMaxModelMemoryLimit ? { effectiveMaxModelMemoryLimit } : {}),
    };
  };
}
