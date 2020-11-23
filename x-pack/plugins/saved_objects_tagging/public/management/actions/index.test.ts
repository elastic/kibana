/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../../../src/core/public/mocks';
import { createTagCapabilities } from '../../../common/test_utils';
import { TagsCapabilities } from '../../../common/capabilities';
import { tagClientMock } from '../../services/tags/tags_client.mock';
import { TagBulkAction } from '../types';

import { getBulkActions } from './index';

describe('getBulkActions', () => {
  let core: ReturnType<typeof coreMock.createStart>;
  let tagClient: ReturnType<typeof tagClientMock.create>;
  let clearSelection: jest.MockedFunction<() => void>;
  let setLoading: jest.MockedFunction<(loading: boolean) => void>;

  beforeEach(() => {
    core = coreMock.createStart();
    tagClient = tagClientMock.create();
    clearSelection = jest.fn();
    setLoading = jest.fn();
  });

  const getActions = (caps: Partial<TagsCapabilities>) =>
    getBulkActions({
      core,
      tagClient,
      clearSelection,
      setLoading,
      capabilities: createTagCapabilities(caps),
    });

  const getIds = (actions: TagBulkAction[]) => actions.map((action) => action.id);

  it('only returns the `delete` action if user got `delete` permission', () => {
    let actions = getActions({ delete: true });

    expect(getIds(actions)).toContain('delete');

    actions = getActions({ delete: false });

    expect(getIds(actions)).not.toContain('delete');
  });
});
