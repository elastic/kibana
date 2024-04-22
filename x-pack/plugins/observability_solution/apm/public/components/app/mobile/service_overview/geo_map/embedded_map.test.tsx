/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/common';
import React from 'react';
import { EmbeddedMap } from './embedded_map';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { MemoryRouter } from 'react-router-dom';
import { MapTypes } from '../../../../../../common/mobile/constants';

describe('Embedded Map', () => {
  it('it renders', async () => {
    const mockSetLayerList = jest.fn();
    const mockUpdateInput = jest.fn();
    const mockRender = jest.fn();
    const mockReload = jest.fn();

    const mockEmbeddable = embeddablePluginMock.createStartContract();
    mockEmbeddable.getEmbeddableFactory = jest.fn().mockImplementation(() => ({
      create: () => ({
        setLayerList: mockSetLayerList,
        updateInput: mockUpdateInput,
        render: mockRender,
        reload: mockReload,
      }),
    }));

    const mockSpaces = {
      getActiveSpace: jest
        .fn()
        .mockImplementation(() => ({ id: 'mockSpaceId' })),
    };

    const mockDataView = {
      id: 'mock-id',
      title: 'mock-title',
      timeFieldName: '@timestamp',
      isPersisted: () => false,
      getName: () => 'mock-data-view',
      toSpec: () => ({}),
      fields: [],
      metaFields: [],
    } as unknown as DataView;

    const { findByTestId } = render(
      <MemoryRouter
        initialEntries={[
          '/mobile-services/{serviceName}/overview?rangeFrom=now-15m&rangeTo=now&',
        ]}
      >
        <MockApmPluginContextWrapper>
          <KibanaContextProvider
            services={{ embeddable: mockEmbeddable, spaces: mockSpaces }}
          >
            <EmbeddedMap
              selectedMap={MapTypes.Http}
              filters={[]}
              start="2022-12-20T10:00:00.000Z"
              end="2022-12-20T10:15:00.000Z"
              dataView={mockDataView}
            />
          </KibanaContextProvider>
        </MockApmPluginContextWrapper>
      </MemoryRouter>
    );
    expect(
      await findByTestId('serviceOverviewEmbeddedMap')
    ).toBeInTheDocument();

    expect(mockSetLayerList).toHaveBeenCalledTimes(1);
    expect(mockUpdateInput).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
});
