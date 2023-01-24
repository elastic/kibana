/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createTagCapabilities } from '../../../common/test_utils';
import { TagsCapabilities } from '../../../common/capabilities';
import { tagClientMock } from '../../services/tags/tags_client.mock';
import { tagsCacheMock } from '../../services/tags/tags_cache.mock';
import { assignmentServiceMock } from '../../services/assignments/assignment_service.mock';
import { TagBulkAction } from '../types';

import { getBulkActions } from '.';

describe('getBulkActions', () => {
  let core: ReturnType<typeof coreMock.createStart>;
  let tagClient: ReturnType<typeof tagClientMock.create>;
  let tagCache: ReturnType<typeof tagsCacheMock.create>;
  let assignmentService: ReturnType<typeof assignmentServiceMock.create>;
  let clearSelection: jest.MockedFunction<() => void>;
  let setLoading: jest.MockedFunction<(loading: boolean) => void>;

  beforeEach(() => {
    core = coreMock.createStart();
    tagClient = tagClientMock.create();
    tagCache = tagsCacheMock.create();
    assignmentService = assignmentServiceMock.create();
    clearSelection = jest.fn();
    setLoading = jest.fn();
  });

  const getActions = (
    caps: Partial<TagsCapabilities>,
    { assignableTypes = ['foo', 'bar'] }: { assignableTypes?: string[] } = {}
  ) =>
    getBulkActions({
      core,
      tagClient,
      tagCache,
      assignmentService,
      clearSelection,
      setLoading,
      assignableTypes,
      capabilities: createTagCapabilities(caps),
    });

  const getIds = (actions: TagBulkAction[]) => actions.map((action) => action.id);

  it('only returns the `delete` action if user has `delete` permission', () => {
    let actions = getActions({ delete: true });

    expect(getIds(actions)).toContain('delete');

    actions = getActions({ delete: false });

    expect(getIds(actions)).not.toContain('delete');
  });

  it('only returns the `assign` action if user has `assign` permission and there is at least one assignable type', () => {
    let actions = getActions({ assign: true }, { assignableTypes: ['foo'] });

    expect(getIds(actions)).toContain('assign');

    actions = getActions({ assign: false }, { assignableTypes: ['foo'] });

    expect(getIds(actions)).not.toContain('assign');

    actions = getActions({ assign: true }, { assignableTypes: [] });

    expect(getIds(actions)).not.toContain('assign');
  });
});
