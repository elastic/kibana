/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';

import { StartServicesAccessor } from 'kibana/server';
import {
  ISearchStrategy,
  SearchStrategyDependencies,
} from '../../../../../../src/plugins/data/server';

import { RuntimeFieldStrategyRequest, RuntimeFieldStrategyResponse } from '../../../common';
import { StartPlugins } from '../../types';
import { formatIndexFields, getDataViewById } from '../index_fields';

export const runtimeFieldProvider = (
  getStartServices: StartServicesAccessor<StartPlugins>
): ISearchStrategy<RuntimeFieldStrategyRequest, RuntimeFieldStrategyResponse> => {
  return {
    search: (request, _, deps) => from(requestRuntimeFieldSearch(request, deps, getStartServices)),
  };
};

export const requestRuntimeFieldSearch = async (
  request: RuntimeFieldStrategyRequest,
  deps: SearchStrategyDependencies,
  getStartServices: StartServicesAccessor<StartPlugins>
): Promise<RuntimeFieldStrategyResponse> => {
  const dataView = await getDataViewById(request.dataViewId, deps, getStartServices);

  const patternList = dataView.title.split(',');
  const dataViewSpec = dataView.toSpec();
  const dataViewFields = dataViewSpec.fields ?? {};
  const runtimeMapping = dataViewSpec.runtimeFieldMap ?? {};

  const fieldDescriptor = [[dataViewFields[request.fieldName]]];

  const indexField = await formatIndexFields({}, fieldDescriptor, patternList, []);

  return {
    indexField: indexField[0],
    runtimeMapping: runtimeMapping[request.fieldName],
    rawResponse: {
      timed_out: false,
      took: -1,
      _shards: {
        total: -1,
        successful: -1,
        failed: -1,
        skipped: -1,
      },
      hits: {
        total: -1,
        max_score: -1,
        hits: [
          {
            _index: '',
            _type: '',
            _id: '',
            _score: -1,
            _source: null,
          },
        ],
      },
    },
  };
};
