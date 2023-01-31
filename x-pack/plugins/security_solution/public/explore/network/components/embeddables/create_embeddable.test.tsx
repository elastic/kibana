/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { createEmbeddable } from './create_embeddable';
import { createHtmlPortalNode } from 'react-reverse-portal';

const mockEmbeddable = embeddablePluginMock.createStartContract();

mockEmbeddable.getEmbeddableFactory = jest.fn().mockImplementation(() => ({
  create: () => ({
    reload: jest.fn(),
    setRenderTooltipContent: jest.fn(),
    setLayerList: jest.fn(),
  }),
}));

describe('createEmbeddable', () => {
  test('attaches refresh action', async () => {
    const setQueryMock = jest.fn();
    await createEmbeddable(
      [],
      [],
      { query: '', language: 'kuery' },
      '2020-07-07T08:20:18.966Z',
      '2020-07-08T08:20:18.966Z',
      setQueryMock,
      createHtmlPortalNode(),
      mockEmbeddable
    );
    expect(setQueryMock).toHaveBeenCalledTimes(1);
  });

  test('attaches refresh action with correct reference', async () => {
    const setQueryMock = jest.fn(({ id, inspect, loading, refetch }) => refetch);
    const embeddable = await createEmbeddable(
      [],
      [],
      { query: '', language: 'kuery' },
      '2020-07-07T08:20:18.966Z',
      '2020-07-08T08:20:18.966Z',
      setQueryMock,
      createHtmlPortalNode(),
      mockEmbeddable
    );
    expect(setQueryMock.mock.calls[0][0].refetch).not.toBe(embeddable.reload);
    setQueryMock.mock.results[0].value();
    expect(embeddable.reload).toHaveBeenCalledTimes(1);
  });
});
