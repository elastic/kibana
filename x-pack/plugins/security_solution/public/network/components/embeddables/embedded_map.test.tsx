/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, ReactWrapper, shallow } from 'enzyme';
import React from 'react';
import * as redux from 'react-redux';
import { waitFor } from '@testing-library/react';

import '../../../common/mock/match_media';
import { useIndexPatterns } from '../../../common/hooks/use_index_patterns';
import { TestProviders } from '../../../common/mock';

import { EmbeddedMapComponent } from './embedded_map';
import { createEmbeddable } from './embedded_map_helpers';

const mockUseIndexPatterns = useIndexPatterns as jest.Mock;
jest.mock('../../../common/hooks/use_index_patterns');
mockUseIndexPatterns.mockImplementation(() => [true, []]);

jest.mock('../../../common/lib/kibana');
jest.mock('./embedded_map_helpers', () => ({
  createEmbeddable: jest.fn(),
}));

const mockGetStorage = jest.fn();
const mockSetStorage = jest.fn();

jest.mock('../../../common/lib/kibana', () => {
  return {
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
  };
});
jest.mock('../../../common/containers/sourcerer', () => {
  return {
    useSourcererDataView: () => ({
      selectedPatterns: ['filebeat-*', 'packetbeat-*'],
    }),
  };
});
jest.mock('./index_patterns_missing_prompt', () => {
  return {
    IndexPatternsMissingPrompt: jest.fn(() => <div data-test-subj="IndexPatternsMissingPrompt" />),
  };
});

describe('EmbeddedMapComponent', () => {
  const setQuery: jest.Mock = jest.fn();
  const mockSelector = {
    kibanaDataViews: [
      { id: '6f1eeb50-023d-11eb-bcb6-6ba0578012a9', title: 'filebeat-*' },
      { id: '28995490-023d-11eb-bcb6-6ba0578012a9', title: 'auditbeat-*' },
    ],
  };
  const mockCreateEmbeddable = {
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

  beforeEach(() => {
    setQuery.mockClear();
    mockGetStorage.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    expect(wrapper.find('EmbeddedMapComponent')).toMatchSnapshot();
  });

  test('renders services.embeddable.EmbeddablePanel', async () => {
    const spy = jest.spyOn(redux, 'useSelector');
    spy.mockReturnValue(mockSelector);

    (createEmbeddable as jest.Mock).mockResolvedValue(mockCreateEmbeddable);

    const wrapper: ReactWrapper = mount(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="EmbeddablePanel"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="IndexPatternsMissingPrompt"]').exists()).toEqual(false);
      expect(wrapper.find('[data-test-subj="loading-panel"]').exists()).toEqual(false);
    });
  });

  test('renders IndexPatternsMissingPrompt', async () => {
    const spy = jest.spyOn(redux, 'useSelector');
    spy.mockReturnValue({
      ...mockSelector,
      kibanaDataViews: [],
    });

    (createEmbeddable as jest.Mock).mockResolvedValue(mockCreateEmbeddable);

    const wrapper: ReactWrapper = mount(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="EmbeddablePanel"]').exists()).toEqual(false);
      expect(wrapper.find('[data-test-subj="IndexPatternsMissingPrompt"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="loading-panel"]').exists()).toEqual(false);
    });
  });

  test('renders Loader', async () => {
    const spy = jest.spyOn(redux, 'useSelector');
    spy.mockReturnValue(mockSelector);

    (createEmbeddable as jest.Mock).mockResolvedValue(null);

    const wrapper: ReactWrapper = mount(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="EmbeddablePanel"]').exists()).toEqual(false);
      expect(wrapper.find('[data-test-subj="IndexPatternsMissingPrompt"]').exists()).toEqual(false);
      expect(wrapper.find('[data-test-subj="loading-panel"]').exists()).toEqual(true);
    });
  });

  test('map hidden on close', async () => {
    mockGetStorage.mockReturnValue(false);
    const wrapper = mount(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="siemEmbeddable"]').first().exists()).toEqual(false);

    const container = wrapper.find('[data-test-subj="false-toggle-network-map"]').at(0);
    container.simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(mockSetStorage).toHaveBeenNthCalledWith(1, 'network_map_visbile', true);
      expect(wrapper.find('[data-test-subj="siemEmbeddable"]').first().exists()).toEqual(true);
    });
  });

  test('map visible on open', async () => {
    const wrapper = mount(
      <TestProviders>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="siemEmbeddable"]').first().exists()).toEqual(true);
    const container = wrapper.find('[data-test-subj="true-toggle-network-map"]').at(0);
    container.simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(mockSetStorage).toHaveBeenNthCalledWith(1, 'network_map_visbile', false);
      expect(wrapper.find('[data-test-subj="siemEmbeddable"]').first().exists()).toEqual(false);
    });
  });
});
