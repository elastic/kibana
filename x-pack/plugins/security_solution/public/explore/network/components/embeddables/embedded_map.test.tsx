/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import * as redux from 'react-redux';

import '../../../../common/mock/match_media';
import { TestProviders } from '../../../../common/mock';

import { EmbeddedMapComponent } from './embedded_map';
import { createEmbeddable } from './create_embeddable';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { getLayerList } from './map_config';
import { useIsFieldInIndexPattern } from '../../../containers/fields';

jest.mock('./create_embeddable');
jest.mock('./map_config');
jest.mock('../../../../common/containers/sourcerer');
jest.mock('../../../containers/fields');
jest.mock('./index_patterns_missing_prompt', () => ({
  IndexPatternsMissingPrompt: jest.fn(() => <div data-test-subj="IndexPatternsMissingPrompt" />),
}));
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      embeddable: {
        EmbeddablePanel: jest.fn(() => <div data-test-subj="EmbeddablePanel" />),
      },
      docLinks: {
        ELASTIC_WEBSITE_URL: 'ELASTIC_WEBSITE_URL',
        links: {
          siem: { networkMap: '' },
        },
      },
      storage: {
        get: mockGetStorage,
        set: mockSetStorage,
      },
    },
  }),
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    remove: jest.fn(),
  }),
}));

const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
const mockCreateEmbeddable = createEmbeddable as jest.Mock;
const mockUseIsFieldInIndexPattern = useIsFieldInIndexPattern as jest.Mock;
const mockGetStorage = jest.fn();
const mockSetStorage = jest.fn();
const setQuery: jest.Mock = jest.fn();
const filebeatDataView = { id: '6f1eeb50-023d-11eb-bcb6-6ba0578012a9', title: 'filebeat-*' };
const packetbeatDataView = { id: '28995490-023d-11eb-bcb6-6ba0578012a9', title: 'packetbeat-*' };
const mockSelector = {
  kibanaDataViews: [filebeatDataView, packetbeatDataView],
};
const embeddableValue = {
  destroyed: false,
  enhancements: { dynamicActions: {} },
  getActionContext: jest.fn(),
  getFilterActions: jest.fn(),
  id: '70969ddc-4d01-4048-8073-4ea63d595638',
  input: {
    viewMode: 'view',
    title: 'Source -> Destination Point-to-Point Map',
    id: '70969ddc-4d01-4048-8073-4ea63d595638',
    filters: Array(0),
    hidePanelTitles: true,
  },
  input$: {},
  isContainer: false,
  output: {},
  output$: {},
  parent: undefined,
  parentSubscription: undefined,
  renderComplete: {},
  runtimeId: 1,
  reload: jest.fn(),
  setLayerList: jest.fn(),
  setEventHandlers: jest.fn(),
  setRenderTooltipContent: jest.fn(),
  type: 'map',
  updateInput: jest.fn(),
};
const testProps = {
  endDate: '2019-08-28T05:50:57.877Z',
  filters: [],
  query: { query: '', language: 'kuery' },
  setQuery,
  startDate: '2019-08-28T05:50:47.877Z',
};
describe('EmbeddedMapComponent', () => {
  beforeEach(() => {
    setQuery.mockClear();
    mockGetStorage.mockReturnValue(true);
    jest.spyOn(redux, 'useSelector').mockReturnValue(mockSelector);
    mockUseSourcererDataView.mockReturnValue({ selectedPatterns: ['filebeat-*', 'packetbeat-*'] });
    mockCreateEmbeddable.mockResolvedValue(embeddableValue);
    mockUseIsFieldInIndexPattern.mockReturnValue(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(getByTestId('EmbeddedMapComponent')).toBeInTheDocument();
    });
  });

  test('renders services.embeddable.EmbeddablePanel', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId('EmbeddablePanel')).toBeInTheDocument();
      expect(queryByTestId('IndexPatternsMissingPrompt')).not.toBeInTheDocument();
      expect(queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  test('renders IndexPatternsMissingPrompt', async () => {
    jest.spyOn(redux, 'useSelector').mockReturnValue({
      ...mockSelector,
      kibanaDataViews: [],
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(queryByTestId('EmbeddablePanel')).not.toBeInTheDocument();
      expect(getByTestId('IndexPatternsMissingPrompt')).toBeInTheDocument();
      expect(queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  test('renders Loader', async () => {
    mockCreateEmbeddable.mockResolvedValue(null);

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(queryByTestId('EmbeddablePanel')).not.toBeInTheDocument();
      expect(queryByTestId('IndexPatternsMissingPrompt')).not.toBeInTheDocument();
      expect(getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  test('map hidden on close', async () => {
    mockGetStorage.mockReturnValue(false);
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    expect(queryByTestId('siemEmbeddable')).not.toBeInTheDocument();
    getByTestId('false-toggle-network-map').click();

    await waitFor(() => {
      expect(mockSetStorage).toHaveBeenNthCalledWith(1, 'network_map_visbile', true);
      expect(getByTestId('siemEmbeddable')).toBeInTheDocument();
    });
  });

  test('map visible on open', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    expect(getByTestId('siemEmbeddable')).toBeInTheDocument();
    getByTestId('true-toggle-network-map').click();

    await waitFor(() => {
      expect(mockSetStorage).toHaveBeenNthCalledWith(1, 'network_map_visbile', false);
      expect(queryByTestId('siemEmbeddable')).not.toBeInTheDocument();
    });
  });

  test('On mount, selects existing Kibana data views that match any selected index pattern', async () => {
    render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      const dataViewArg = (getLayerList as jest.Mock).mock.calls[0][0];
      expect(dataViewArg).toEqual([filebeatDataView]);
    });
  });

  test('On rerender with new selected patterns, selects existing Kibana data views that match any selected index pattern', async () => {
    mockUseSourcererDataView.mockReturnValue({
      selectedPatterns: ['filebeat-*', 'auditbeat-*'],
    });
    const { rerender } = render(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      const dataViewArg = (getLayerList as jest.Mock).mock.calls[0][0];
      expect(dataViewArg).toEqual([filebeatDataView]);
    });
    mockUseSourcererDataView.mockReturnValue({
      selectedPatterns: ['filebeat-*', 'packetbeat-*'],
    });
    rerender(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      // data view is updated with the returned embeddable.setLayerList callback, which is passesd getLayerList(dataViews)
      const dataViewArg = (getLayerList as jest.Mock).mock.calls[1][0];
      expect(dataViewArg).toEqual([filebeatDataView, packetbeatDataView]);
    });
  });
});
