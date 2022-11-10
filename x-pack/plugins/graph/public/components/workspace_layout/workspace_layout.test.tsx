/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { WorkspaceLayoutComponent } from '.';
import { coreMock } from '@kbn/core/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { Start as InspectorStart, RequestAdapter } from '@kbn/inspector-plugin/public';
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import {
  GraphSavePolicy,
  GraphWorkspaceSavedObject,
  IndexPatternProvider,
  Workspace,
} from '../../types';
import { OverlayStart, Capabilities } from '@kbn/core/public';
import { SharingSavedObjectProps } from '../../helpers/use_workspace_loader';
import { GraphVisualization } from '../graph_visualization';

jest.mock('react-router-dom', () => {
  const useLocation = () => ({
    search: '?query={}',
  });
  return {
    useLocation,
  };
});

describe('workspace_layout', () => {
  const defaultProps = {
    renderCounter: 1,
    loading: false,
    savedWorkspace: { id: 'test' } as GraphWorkspaceSavedObject,
    hasFields: true,
    overlays: {} as OverlayStart,
    workspaceInitialized: true,
    indexPatterns: [],
    indexPatternProvider: {} as IndexPatternProvider,
    capabilities: {} as Capabilities,
    coreStart: coreMock.createStart(),
    graphSavePolicy: 'configAndDataWithConsent' as GraphSavePolicy,
    navigation: {} as NavigationStart,
    canEditDrillDownUrls: true,
    setHeaderActionMenu: jest.fn(),
    sharingSavedObjectProps: {
      outcome: 'exactMatch',
      aliasTargetId: '',
    } as SharingSavedObjectProps,
    spaces: spacesPluginMock.createStartContract(),
    inspect: { open: jest.fn() } as unknown as InspectorStart,
    requestAdapter: {
      start: () => ({
        stats: jest.fn(),
        json: jest.fn(),
      }),
      reset: jest.fn(),
    } as unknown as RequestAdapter,
    workspace: {} as unknown as Workspace,
  };
  it('should display conflict notification if outcome is conflict', () => {
    shallow(
      <WorkspaceLayoutComponent
        {...defaultProps}
        sharingSavedObjectProps={{ outcome: 'conflict', aliasTargetId: 'conflictId' }}
      />
    );
    expect(defaultProps.spaces.ui.components.getLegacyUrlConflict).toHaveBeenCalledWith({
      currentObjectId: 'test',
      objectNoun: 'Graph',
      otherObjectId: 'conflictId',
      otherObjectPath: '#/workspace/conflictId?query={}',
    });
  });
  it('should not show GraphVisualization when workspaceInitialized is false, savedWorkspace.id is undefined, and savedWorkspace.isSaving is false', () => {
    const component = shallow(
      <WorkspaceLayoutComponent
        {...defaultProps}
        workspaceInitialized={false}
        savedWorkspace={{ id: undefined, isSaving: false } as GraphWorkspaceSavedObject}
      />
    );
    expect(component.find(GraphVisualization).exists()).toBe(false);
  });
  it('should show GraphVisualization when workspaceInitialized is true', () => {
    const component = shallow(
      <WorkspaceLayoutComponent
        {...defaultProps}
        workspaceInitialized={true}
        savedWorkspace={{ id: undefined, isSaving: false } as GraphWorkspaceSavedObject}
      />
    );
    expect(component.find(GraphVisualization).exists()).toBe(true);
  });
  it('should show GraphVisualization when savedWorkspace.id is defined', () => {
    const component = shallow(
      <WorkspaceLayoutComponent
        {...defaultProps}
        workspaceInitialized={false}
        savedWorkspace={{ id: 'test', isSaving: false } as GraphWorkspaceSavedObject}
      />
    );
    expect(component.find(GraphVisualization).exists()).toBe(true);
  });
  it('should show GraphVisualization when savedWorkspace.isSaving is true', () => {
    const component = shallow(
      <WorkspaceLayoutComponent
        {...defaultProps}
        workspaceInitialized={false}
        savedWorkspace={{ id: undefined, isSaving: true } as GraphWorkspaceSavedObject}
      />
    );
    expect(component.find(GraphVisualization).exists()).toBe(true);
  });
});
