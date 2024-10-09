/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntityDefinitionUpdate } from './merge_definition_update';
import { EntityDefinition } from '@kbn/entities-schema';

const partialDefinition: EntityDefinition = {
  id: 'originalId',
  version: '1.0.0',
  name: 'originalName',
  type: 'originalType',
  identityFields: [{ field: 'originalField', optional: false }],
  displayNameTemplate: 'originalTemplate',
  managed: false,
  history: {
    timestampField: 'timestamp',
    interval: '1m',
    settings: {
      lookbackPeriod: '1d',
    },
  },
};
describe('mergeEntityDefinitionUpdate', () => {
  it('should overwrite indexPatterns if dataViewId is set', () => {
    const update = {
      dataViewId: 'newDataViewId',
      version: '1.0.1',
    };

    const result = mergeEntityDefinitionUpdate(
      { ...partialDefinition, indexPatterns: ['testPattern'] },
      update
    );

    expect(result.dataViewId).toEqual('newDataViewId');
    expect(result.indexPatterns).toEqual(undefined);
  });

  it('should overwrite dataViewId if indexPatterns is set', () => {
    const definition = {
      ...partialDefinition,
      dataViewId: 'originalDataViewId',
    };
    const update = {
      indexPatterns: ['newIndexPattern'],
      version: '1.0.1',
    };

    const result = mergeEntityDefinitionUpdate(definition, update);

    expect(result.indexPatterns).toEqual(['newIndexPattern']);
    expect(result.dataViewId).toEqual(undefined);
  });
});
