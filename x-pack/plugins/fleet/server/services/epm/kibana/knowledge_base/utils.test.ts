/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaMiscAssetTypes,
  KibanaSavedObjectType,
  ElasticsearchAssetType,
} from '../../../../types';
import { getIndexName, getSavedObjectId, isKnowledgeBaseEntryReference } from './utils';

describe('getIndexName', () => {
  it('returns the correct index name for system index', () => {
    expect(
      getIndexName({
        packageName: 'kibana-kb',
        entryName: 'kibana-8.15',
        system: true,
      })
    ).toEqual('.kibana-kibana-kb_kibana-8.15');
  });
  it('returns the correct index name for non-system index', () => {
    expect(
      getIndexName({
        packageName: 'es-kb',
        entryName: 'es-8.15',
        system: false,
      })
    ).toEqual('es-kb_es-8.15');
  });
});

describe('getSavedObjectId', () => {
  it('returns the expected Id', () => {
    expect(
      getSavedObjectId({
        packageName: 'kibana-kb',
        entryName: 'kibana-8.15',
      })
    ).toEqual('entry_kibana-kb_kibana-8.15');
  });
});

describe('isKnowledgeBaseEntryReference', () => {
  it('returns true for knowledgeBaseEntry references', () => {
    expect(
      isKnowledgeBaseEntryReference({
        type: KibanaMiscAssetTypes.knowledgeBaseEntry,
        id: 'some-id',
      })
    ).toBe(true);
  });

  it('returns false for Kibana asset references', () => {
    expect(
      isKnowledgeBaseEntryReference({
        type: KibanaSavedObjectType.map,
        id: 'some-id',
      })
    ).toBe(false);
  });

  it('returns false for ES asset references', () => {
    expect(
      isKnowledgeBaseEntryReference({
        type: ElasticsearchAssetType.ingestPipeline,
        id: 'some-id',
      })
    ).toBe(false);
  });
});
