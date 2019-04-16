/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Aggregation, Field } from '../../../../common/types/fields';
import { fieldServiceProvider } from './field_service';

export function jobCapsProvider(callWithRequest: any) {
  async function jobCaps(indexPattern: string) {
    const fieldService = fieldServiceProvider(indexPattern, callWithRequest);
    const { aggs, fields } = await fieldService.getData();
    convertForStringify(aggs, fields);

    return {
      [indexPattern]: {
        aggs,
        fields,
      },
    };
  }
  return {
    jobCaps,
  };
}

// replace the recursive field and agg references with a
// map if ids to allow it to be stringified for the network
function convertForStringify(aggs: Aggregation[], fields: Field[]) {
  fields.forEach(f => {
    f.aggIds = f.aggs ? f.aggs.map(a => a.id) : [];
    delete f.aggs;
  });
  aggs.forEach(a => {
    a.fieldIds = a.fields ? a.fields.map(f => f.id) : [];
    delete a.fields;
  });
}
