/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { add820Indices } from './migrations';
import { SavedObject, SavedObjectMigrationContext } from 'src/core/server';
import { DynamicSettings } from '../../../common/runtime_types';

describe('add820Indices migration', () => {
  const context = { log: { warning: () => {} } } as unknown as SavedObjectMigrationContext;

  const makeSettings = (heartbeatIndices: string): SavedObject<DynamicSettings> => {
    return {
      id: '1',
      type: 't',
      references: [],
      attributes: {
        heartbeatIndices,
        certAgeThreshold: 1,
        certExpirationThreshold: 2,
        defaultConnectors: ['example'],
      },
    };
  };

  it("adds the synthetics-* index if it's not in the indices settings", () => {
    const doc = makeSettings('heartbeat-8*,something_else');
    const result = add820Indices(doc, context);
    expect(result).toEqual({
      ...doc,
      attributes: {
        ...doc.attributes,
        heartbeatIndices: 'heartbeat-8*,something_else,synthetics-*',
      },
    });
  });

  it("adds the heartbeat-8* index if it's not in the indices settings", () => {
    const doc = makeSettings('synthetics-*,something_else');
    const result = add820Indices(doc, context);
    expect(result).toEqual({
      ...doc,
      attributes: {
        ...doc.attributes,
        heartbeatIndices: 'synthetics-*,something_else,heartbeat-8*',
      },
    });
  });

  it("adds both synthetics-* and heartbeat-8* index if they're not present in the indices", () => {
    const doc = makeSettings('something-*,something_else');
    const result = add820Indices(doc, context);
    expect(result).toEqual({
      ...doc,
      attributes: {
        ...doc.attributes,
        heartbeatIndices: 'something-*,something_else,synthetics-*,heartbeat-8*',
      },
    });
  });

  it('works for empty heartbeat indices fields', () => {
    const doc = makeSettings('');
    const result = add820Indices(doc, context);
    expect(result).toEqual({
      ...doc,
      attributes: {
        ...doc.attributes,
        heartbeatIndices: 'synthetics-*,heartbeat-8*',
      },
    });
  });

  it('works for undefined heartbeat indices fields', () => {
    const doc = makeSettings('');

    // We must TS ignore this so that we can delete this
    // non-optional field and test that the migration still works
    // when the field does not exist in the document
    // @ts-expect-error
    delete doc.attributes.heartbeatIndices;
    const result = add820Indices(doc, context);
    expect(result).toEqual({
      ...doc,
      attributes: {
        ...doc.attributes,
        heartbeatIndices: 'synthetics-*,heartbeat-8*',
      },
    });
  });
});
