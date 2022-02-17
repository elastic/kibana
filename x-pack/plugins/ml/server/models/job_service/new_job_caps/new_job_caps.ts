/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from 'kibana/server';
import type { DataViewsService } from '../../../../../../../src/plugins/data_views/common';
import type { Aggregation, Field, NewJobCapsResponse } from '../../../../common/types/fields';
import { _DOC_COUNT } from '../../../../common/constants/field_types';
import { fieldServiceProvider } from './field_service';

export function newJobCapsProvider(client: IScopedClusterClient) {
  async function newJobCaps(
    indexPattern: string,
    isRollup: boolean = false,
    dataViewsService: DataViewsService
  ): Promise<NewJobCapsResponse> {
    const fieldService = fieldServiceProvider(indexPattern, isRollup, client, dataViewsService);
    const { aggs, fields } = await fieldService.getData();
    convertForStringify(aggs, fields);

    // Remove the _doc_count field as we don't want to display this in the fields lists in the UI
    const fieldsWithoutDocCount = fields.filter(({ id }) => id !== _DOC_COUNT);
    return {
      [indexPattern]: {
        aggs,
        fields: fieldsWithoutDocCount,
      },
    };
  }
  return {
    newJobCaps,
  };
}

// replace the recursive field and agg references with a
// map of ids to allow it to be stringified for transportation
// over the network.
function convertForStringify(aggs: Aggregation[], fields: Field[]): void {
  fields.forEach((f) => {
    f.aggIds = f.aggs ? f.aggs.map((a) => a.id) : [];
    delete f.aggs;
  });
  aggs.forEach((a) => {
    if (a.fields !== undefined) {
      // if the aggregation supports fields, i.e. it's fields list isn't undefined,
      // create a list of field ids
      a.fieldIds = a.fields.map((f) => f.id);
    }
    delete a.fields;
  });
}
