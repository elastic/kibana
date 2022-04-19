/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useWorkspaceLoader, UseWorkspaceLoaderProps } from './use_workspace_loader';
import { coreMock } from '@kbn/core/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { createMockGraphStore } from '../state_management/mocks';
import { Workspace } from '../types';
import { SavedObjectsClientCommon } from '@kbn/data-plugin/common';
import { renderHook, act, RenderHookOptions } from '@testing-library/react-hooks';

jest.mock('react-router-dom', () => {
  const useLocation = () => ({
    search: '?query={}',
  });

  const replaceFn = jest.fn();

  const useHistory = () => ({
    replace: replaceFn,
  });
  return {
    useHistory,
    useLocation,
    useParams: () => ({
      id: '1',
    }),
  };
});

const mockSavedObjectsClient = {
  resolve: jest.fn().mockResolvedValue({
    saved_object: { id: 10, _version: '7.15.0', attributes: { wsState: '{}' } },
    outcome: 'exactMatch',
  }),
  find: jest.fn().mockResolvedValue({ title: 'test', perPage: 1, total: 1, page: 1 }),
} as unknown as SavedObjectsClientCommon;

describe('use_workspace_loader', () => {
  const defaultProps = {
    workspaceRef: { current: {} as Workspace },
    store: createMockGraphStore({}).store,
    savedObjectsClient: mockSavedObjectsClient,
    coreStart: coreMock.createStart(),
    spaces: spacesPluginMock.createStartContract(),
  } as unknown as UseWorkspaceLoaderProps;

  it('should not redirect if outcome is exactMatch', async () => {
    await act(async () => {
      renderHook(
        () => useWorkspaceLoader(defaultProps),
        defaultProps as RenderHookOptions<UseWorkspaceLoaderProps>
      );
    });
    expect(defaultProps.spaces?.ui.redirectLegacyUrl).not.toHaveBeenCalled();
    expect(defaultProps.store.dispatch).toHaveBeenCalled();
  });
  it('should redirect if outcome is aliasMatch', async () => {
    const props = {
      ...defaultProps,
      spaces: spacesPluginMock.createStartContract(),
      savedObjectsClient: {
        ...mockSavedObjectsClient,
        resolve: jest.fn().mockResolvedValue({
          saved_object: { id: 10, _version: '7.15.0', attributes: { wsState: '{}' } },
          outcome: 'aliasMatch',
          alias_target_id: 'aliasTargetId',
          alias_purpose: 'savedObjectConversion',
        }),
      },
    } as unknown as UseWorkspaceLoaderProps;

    await act(async () => {
      renderHook(
        () => useWorkspaceLoader(props),
        props as RenderHookOptions<UseWorkspaceLoaderProps>
      );
    });
    expect(props.spaces?.ui.redirectLegacyUrl).toHaveBeenCalledWith({
      path: '#/workspace/aliasTargetId?query={}',
      aliasPurpose: 'savedObjectConversion',
      objectNoun: 'Graph',
    });
  });
});
