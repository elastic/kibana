/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mount } from 'enzyme';
import { useWorkspaceLoader, UseWorkspaceLoaderProps } from './use_workspace_loader';
import { coreMock } from 'src/core/public/mocks';
import { spacesPluginMock } from '../../../spaces/public/mocks';
import { createMockGraphStore } from '../state_management/mocks';
import { Workspace } from '../types';
import { SavedObjectsClientCommon } from 'src/plugins/data/common';
import { act } from 'react-dom/test-utils';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: jest.fn(),
  }),
  useLocation: () => ({
    location: jest.fn(),
  }),
  useParams: () => ({
    id: jest.fn(),
  }),
}));

const mockSavedObjectsClient = ({
  resolve: jest.fn().mockResolvedValue({
    saved_object: { id: 10, _version: '7.15.0', attributes: { wsState: '{}' } },
    outcome: 'aliasMatch',
    alias_target_id: 'aliasTargetId',
  }),
  find: jest.fn().mockResolvedValue({ title: 'test' }),
} as unknown) as SavedObjectsClientCommon;

async function setup(props: UseWorkspaceLoaderProps) {
  const returnVal = {};
  function TestComponent() {
    Object.assign(returnVal, useWorkspaceLoader(props));
    return null;
  }
  await act(async () => {
    const promise = Promise.resolve();
    mount(<TestComponent />);
    await act(() => promise);
  });
  return returnVal;
}

describe('use_workspace_loader', () => {
  const defaultProps = {
    workspaceRef: { current: {} as Workspace },
    store: createMockGraphStore({}).store,
    savedObjectsClient: mockSavedObjectsClient,
    coreStart: coreMock.createStart(),
    spaces: spacesPluginMock.createStartContract(),
  };

  it('should redirect if outcome is aliasMatch', async () => {
    await act(async () => {
      await setup((defaultProps as unknown) as UseWorkspaceLoaderProps);
    });
    expect(defaultProps.spaces.ui.redirectLegacyUrl).toHaveBeenCalledWith(
      '#/workspace/aliasTargetId',
      'Graph'
    );
  });
});
