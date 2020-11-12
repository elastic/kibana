/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggDescriptor } from '../../../common/descriptor_types';
import { IESAggSource } from '../sources/es_agg_source';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../common/constants';
import { ESDocField } from './es_doc_field';
import { TopTermPercentageField } from './top_term_percentage_field';
import { CountAggField, IESAggField } from './count_agg_field';
import { ESFieldedAggField } from './es_fielded_agg_field';

export function esAggFieldsFactory(
  aggDescriptor: AggDescriptor,
  source: IESAggSource,
  origin: FIELD_ORIGIN,
  canReadFromGeoJson: boolean = true
): IESAggField[] {
  let aggField;
  if (aggDescriptor.type === AGG_TYPE.COUNT) {
    aggField = new CountAggField({
      label: aggDescriptor.label,
      source,
      origin,
      canReadFromGeoJson,
    });
  } else {
    aggField = new ESFieldedAggField({
      label: aggDescriptor.label,
      esDocField:
        'field' in aggDescriptor && aggDescriptor.field
          ? new ESDocField({ fieldName: aggDescriptor.field, source, origin })
          : undefined,
      aggType: aggDescriptor.type,
      source,
      origin,
      canReadFromGeoJson,
    });
  }

  const aggFields: IESAggField[] = [aggField];

  if ('field' in aggDescriptor && aggDescriptor.type === AGG_TYPE.TERMS) {
    aggFields.push(new TopTermPercentageField(aggField, canReadFromGeoJson));
  }

  return aggFields;
}
