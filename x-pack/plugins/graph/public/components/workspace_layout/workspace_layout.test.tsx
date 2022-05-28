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
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import { GraphSavePolicy, GraphWorkspaceSavedObject, IndexPatternProvider } from '../../types';
import { OverlayStart, Capabilities } from '@kbn/core/public';
import { SharingSavedObjectProps } from '../../helpers/use_workspace_loader';

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
});
