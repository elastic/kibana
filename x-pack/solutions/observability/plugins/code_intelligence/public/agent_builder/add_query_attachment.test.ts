/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogItem } from '../api';
import {
  addQueryAttachment,
  buildQueryAttachment,
  describeQueryEntry,
} from './add_query_attachment';

const entry: CatalogItem = {
  id: 'entry-1',
  repository: 'elastic/eis-gateway',
  signal_type: 'log',
  title: 'Upstream request failed',
  description: 'Logged when the gateway cannot reach the inference service.',
  query: 'FROM logs-* | LIMIT 10',
};

describe('buildQueryAttachment', () => {
  it('builds an esql attachment keyed by the entry id', () => {
    const description =
      'Upstream request failed (elastic/eis-gateway, Log): Logged when the gateway cannot reach the inference service.';
    expect(buildQueryAttachment(entry)).toEqual({
      id: 'entry-1',
      type: 'esql',
      description,
      data: { query: 'FROM logs-* | LIMIT 10', description },
    });
  });

  it('leaves out missing parts of the description', () => {
    expect(describeQueryEntry({ id: 'entry-2', query: 'FROM x' })).toBe('entry-2');
    expect(describeQueryEntry({ id: 'entry-3', title: 'T', signal_type: 'span' })).toBe('T (span)');
  });

  it('has no attachment for an entry without a query', () => {
    expect(buildQueryAttachment({ ...entry, query: '  ' })).toBeUndefined();
    expect(buildQueryAttachment({ ...entry, query: undefined })).toBeUndefined();
  });
});

describe('addQueryAttachment', () => {
  it('stages the query and confirms with a toast', () => {
    const dependencies = { stager: { addQuery: jest.fn() }, toasts: { addSuccess: jest.fn() } };
    addQueryAttachment(dependencies, entry);

    expect(dependencies.stager.addQuery).toHaveBeenCalledWith(buildQueryAttachment(entry));
    expect(dependencies.toasts.addSuccess).toHaveBeenCalledWith(
      'Added "Upstream request failed" to the AI Agent'
    );
  });

  it('does nothing for an entry without a query', () => {
    const dependencies = { stager: { addQuery: jest.fn() }, toasts: { addSuccess: jest.fn() } };
    addQueryAttachment(dependencies, { ...entry, query: undefined });

    expect(dependencies.stager.addQuery).not.toHaveBeenCalled();
    expect(dependencies.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
