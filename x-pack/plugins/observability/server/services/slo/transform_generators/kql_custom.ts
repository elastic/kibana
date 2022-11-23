/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { InvalidTransformError } from '../../../errors';
import { kqlCustomIndicatorSchema } from '../../../types/schema';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { TransformGenerator } from '.';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { KQLCustomIndicator, SLO } from '../../../domain/models';

export class KQLCustomTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!kqlCustomIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildCommonGroupBy(slo),
      this.buildAggregations(slo, slo.indicator)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLO, indicator: KQLCustomIndicator) {
    const filter = getElastichsearchQueryOrThrow(indicator.params.query_filter);
    return {
      index: indicator.params.index,
      runtime_mappings: this.buildCommonRuntimeMappings(slo),
      query: filter,
    };
  }

  private buildDestination() {
    return {
      pipeline: SLO_INGEST_PIPELINE_NAME,
      index: SLO_DESTINATION_INDEX_NAME,
    };
  }

  private buildAggregations(slo: SLO, indicator: KQLCustomIndicator) {
    const numerator = getElastichsearchQueryOrThrow(indicator.params.numerator);
    const denominator = getElastichsearchQueryOrThrow(indicator.params.denominator);
    return {
      'slo.numerator': {
        filter: numerator,
      },
      'slo.denominator': {
        filter: denominator,
      },
    };
  }
}

function getElastichsearchQueryOrThrow(kuery: string) {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidTransformError(`Invalid KQL: ${kuery}`);
  }
}
