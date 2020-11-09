/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn().mockReturnValue({
      services: {
        embeddable: {
          EmbeddablePanel: jest.fn(() => <div data-test-subj="EmbeddablePanel" />),
        },
        docLinks: { ELASTIC_WEBSITE_URL: 'ELASTIC_WEBSITE_URL' },
      },
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
    kibanaIndexPatterns: [
      { id: '6f1eeb50-023d-11eb-bcb6-6ba0578012a9', title: 'filebeat-*' },
      { id: '28995490-023d-11eb-bcb6-6ba0578012a9', title: 'auditbeat-*' },
    ],
    sourcererScope: { selectedPatterns: ['filebeat-*', 'packetbeat-*'] },
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
      kibanaIndexPatterns: [],
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
});
