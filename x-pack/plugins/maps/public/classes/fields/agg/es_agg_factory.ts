/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggDescriptor } from '../../../../common/descriptor_types';
import { IESAggSource } from '../../sources/es_agg_source';
import { AGG_TYPE, DEFAULT_PERCENTILE, FIELD_ORIGIN } from '../../../../common/constants';
import { ESDocField } from '../es_doc_field';
import { TopTermPercentageField } from './top_term_percentage_field';
import { CountAggField } from './count_agg_field';
import { IESAggField } from './agg_field_types';
import { AggField } from './agg_field';
import { PercentileAggField } from './percentile_agg_field';

export function esAggFieldsFactory(
  aggDescriptor: AggDescriptor,
  source: IESAggSource,
  origin: FIELD_ORIGIN
): IESAggField[] {
  let aggField;
  if (aggDescriptor.type === AGG_TYPE.COUNT) {
    aggField = new CountAggField({
      label: aggDescriptor.label,
      source,
      origin,
    });
  } else if (aggDescriptor.type === AGG_TYPE.PERCENTILE) {
    aggField = new PercentileAggField({
      label: aggDescriptor.label,
      esDocField:
        'field' in aggDescriptor && aggDescriptor.field
          ? new ESDocField({ fieldName: aggDescriptor.field, source, origin })
          : undefined,
      percentile:
        'percentile' in aggDescriptor && typeof aggDescriptor.percentile === 'number'
          ? aggDescriptor.percentile
          : DEFAULT_PERCENTILE,
      source,
      origin,
    });
  } else {
    aggField = new AggField({
      label: aggDescriptor.label,
      esDocField:
        'field' in aggDescriptor && aggDescriptor.field
          ? new ESDocField({ fieldName: aggDescriptor.field, source, origin })
          : undefined,
      aggType: aggDescriptor.type,
      source,
      origin,
    });
  }

  const aggFields: IESAggField[] = [aggField];

  if ('field' in aggDescriptor && aggDescriptor.type === AGG_TYPE.TERMS) {
    aggFields.push(new TopTermPercentageField(aggField));
  }

  return aggFields;
}
