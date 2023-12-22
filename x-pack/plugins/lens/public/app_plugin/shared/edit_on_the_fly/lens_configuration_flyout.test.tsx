/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderWithReduxStore } from '../../../mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { mockVisualizationMap, mockDatasourceMap, mockDataPlugin } from '../../../mocks';
import type { LensPluginStartDependencies } from '../../../plugin';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { LensEditConfigurationFlyout } from './lens_configuration_flyout';
import type { EditConfigPanelProps } from './types';

const lensAttributes = {
  title: 'test',
  visualizationType: 'testVis',
  state: {
    datasourceStates: {
      testDatasource: {},
    },
    visualization: {},
    filters: [],
    query: {
      esql: 'from index1 | limit 10',
    },
  },
  filters: [],
  query: {
    esql: 'from index1 | limit 10',
  },
  references: [],
} as unknown as TypedLensByValueInput['attributes'];

describe('LensEditConfigurationFlyout', () => {
  const mockStartDependencies =
    createMockStartDependencies() as unknown as LensPluginStartDependencies;
  const data = mockDataPlugin();
  (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
    from: 'now-2m',
    to: 'now',
  });
  const startDependencies = {
    ...mockStartDependencies,
    data,
  };

  function renderConfigFlyout(
    propsOverrides: Partial<EditConfigPanelProps> = {},
    query?: Query | AggregateQuery
  ) {
    return renderWithReduxStore(
      <LensEditConfigurationFlyout
        attributes={lensAttributes}
        updatePanelState={jest.fn()}
        coreStart={coreMock.createStart()}
        startDependencies={startDependencies}
        datasourceMap={mockDatasourceMap()}
        visualizationMap={mockVisualizationMap()}
        closeFlyout={jest.fn()}
        datasourceId={'testDatasource' as EditConfigPanelProps['datasourceId']}
        {...propsOverrides}
      />,
      {},
      {
        preloadedState: {
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: 'state',
            },
          },
          activeDatasourceId: 'testDatasource',
          query: query as Query,
        },
      }
    );
  }

  it('should display the header and the link to editor if necessary props are given', async () => {
    const navigateToLensEditorSpy = jest.fn();

    renderConfigFlyout({
      displayFlyoutHeader: true,
      navigateToLensEditor: navigateToLensEditorSpy,
    });
    expect(screen.getByTestId('editFlyoutHeader')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('navigateToLensEditorLink'));
    expect(navigateToLensEditorSpy).toHaveBeenCalled();
  });

  it('should display the header title correctly for a newly created panel', async () => {
    renderConfigFlyout({
      displayFlyoutHeader: true,
      isNewPanel: true,
    });
    expect(screen.getByTestId('inlineEditingFlyoutLabel').textContent).toBe(
      'Create ES|QL visualization'
    );
  });

  it('should call the closeFlyout callback if cancel button is clicked', async () => {
    const closeFlyoutSpy = jest.fn();

    renderConfigFlyout({
      closeFlyout: closeFlyoutSpy,
    });
    expect(screen.getByTestId('lns-layerPanel-0')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(closeFlyoutSpy).toHaveBeenCalled();
  });

  it('should call the updatePanelState callback if cancel button is clicked', async () => {
    const updatePanelStateSpy = jest.fn();
    renderConfigFlyout({
      updatePanelState: updatePanelStateSpy,
    });
    expect(screen.getByTestId('lns-layerPanel-0')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(updatePanelStateSpy).toHaveBeenCalled();
  });

  it('should call the updateByRefInput callback if cancel button is clicked and savedObjectId exists', async () => {
    const updateByRefInputSpy = jest.fn();

    renderConfigFlyout({
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
    });
    userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(updateByRefInputSpy).toHaveBeenCalled();
  });

  it('should call the saveByRef callback if apply button is clicked and savedObjectId exists', async () => {
    const updateByRefInputSpy = jest.fn();
    const saveByRefSpy = jest.fn();

    renderConfigFlyout({
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
      saveByRef: saveByRefSpy,
    });
    userEvent.click(screen.getByTestId('applyFlyoutButton'));
    expect(updateByRefInputSpy).toHaveBeenCalled();
    expect(saveByRefSpy).toHaveBeenCalled();
  });

  it('should not display the editor if canEditTextBasedQuery prop is false', async () => {
    renderConfigFlyout({
      canEditTextBasedQuery: false,
    });
    expect(screen.queryByTestId('TextBasedLangEditor')).toBeNull();
  });

  it('should not display the editor if canEditTextBasedQuery prop is true but the query is not text based', async () => {
    renderConfigFlyout({
      canEditTextBasedQuery: true,
      attributes: {
        ...lensAttributes,
        state: {
          ...lensAttributes.state,
          query: {
            type: 'kql',
            query: '',
          } as unknown as Query,
        },
      },
    });
    expect(screen.queryByTestId('TextBasedLangEditor')).toBeNull();
  });

  it('should not display the suggestions if hidesSuggestions prop is true', async () => {
    renderConfigFlyout({
      hidesSuggestions: true,
    });
    expect(screen.queryByTestId('InlineEditingSuggestions')).toBeNull();
  });

  it('should display the suggestions if canEditTextBasedQuery prop is true', async () => {
    renderConfigFlyout(
      {
        canEditTextBasedQuery: true,
      },
      {
        esql: 'from index1 | limit 10',
      }
    );
    expect(screen.getByTestId('InlineEditingESQLEditor')).toBeInTheDocument();
    expect(screen.getByTestId('InlineEditingSuggestions')).toBeInTheDocument();
  });
});
