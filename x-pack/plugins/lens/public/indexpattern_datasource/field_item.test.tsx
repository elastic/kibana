/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import { InnerFieldItem, FieldItemProps } from './field_item';
import { coreMock } from 'src/core/public/mocks';
import { mountWithIntl } from '@kbn/test/jest';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { IndexPattern } from './types';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';

const chartsThemeService = chartPluginMock.createSetupContract().theme;

function clickField(wrapper: ReactWrapper, field: string) {
  wrapper.find(`[data-test-subj="lnsFieldListPanelField-${field}"] button`).simulate('click');
}

describe('IndexPattern Field Item', () => {
  let defaultProps: FieldItemProps;
  let indexPattern: IndexPattern;
  let core: ReturnType<typeof coreMock['createSetup']>;
  let data: DataPublicPluginStart;

  beforeEach(() => {
    indexPattern = {
      id: '1',
      title: 'my-fake-index-pattern',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'bytes',
          displayName: 'bytesLabel',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'memory',
          displayName: 'memory',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'unsupported',
          displayName: 'unsupported',
          type: 'geo',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'source',
          displayName: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        },
      ],
    } as IndexPattern;

    core = coreMock.createSetup();
    data = dataPluginMock.createStartContract();
    core.http.post.mockClear();
    defaultProps = {
      indexPattern,
      data,
      core,
      highlight: '',
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      query: { query: '', language: 'lucene' },
      filters: [],
      field: {
        name: 'bytes',
        displayName: 'bytesLabel',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      exists: true,
      chartsThemeService,
      groupIndex: 0,
      itemIndex: 0,
      dropOntoWorkspace: () => {},
      hasSuggestionForField: () => false,
    };

    data.fieldFormats = ({
      getDefaultInstance: jest.fn(() => ({
        convert: jest.fn((s: unknown) => JSON.stringify(s)),
      })),
    } as unknown) as DataPublicPluginStart['fieldFormats'];
  });

  it('should display displayName of a field', () => {
    const wrapper = mountWithIntl(<InnerFieldItem {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="lnsFieldListPanelField"]').first().text()).toEqual(
      'bytesLabel'
    );
  });

  it('should request field stats every time the button is clicked', async () => {
    let resolveFunction: (arg: unknown) => void;

    core.http.post.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = mountWithIntl(<InnerFieldItem {...defaultProps} />);

    clickField(wrapper, 'bytes');

    expect(core.http.post).toHaveBeenCalledWith(`/api/lens/index_stats/1/field`, {
      body: JSON.stringify({
        dslQuery: {
          bool: {
            must: [{ match_all: {} }],
            filter: [],
            should: [],
            must_not: [],
          },
        },
        fromDate: 'now-7d',
        toDate: 'now',
        fieldName: 'bytes',
      }),
    });

    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      resolveFunction!({
        totalDocuments: 4633,
        sampledDocuments: 4633,
        sampledValues: 4633,
        histogram: {
          buckets: [{ count: 705, key: 0 }],
        },
        topValues: {
          buckets: [{ count: 147, key: 0 }],
        },
      });
    });

    wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);

    clickField(wrapper, 'bytes');
    expect(core.http.post).toHaveBeenCalledTimes(1);

    act(() => {
      const closePopover = wrapper.find(EuiPopover).prop('closePopover');

      closePopover();
    });

    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(false);

    act(() => {
      wrapper.setProps({
        dateRange: {
          fromDate: 'now-14d',
          toDate: 'now-7d',
        },
        query: { query: 'geo.src : "US"', language: 'kuery' },
        filters: [
          {
            match: { phrase: { 'geo.dest': 'US' } },
          },
        ],
      });
    });

    clickField(wrapper, 'bytes');

    expect(core.http.post).toHaveBeenCalledTimes(2);
    expect(core.http.post).toHaveBeenLastCalledWith(`/api/lens/index_stats/1/field`, {
      body: JSON.stringify({
        dslQuery: {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [{ match_phrase: { 'geo.src': 'US' } }],
                  minimum_should_match: 1,
                },
              },
              {
                match: { phrase: { 'geo.dest': 'US' } },
              },
            ],
            should: [],
            must_not: [],
          },
        },
        fromDate: 'now-14d',
        toDate: 'now-7d',
        fieldName: 'bytes',
      }),
    });
  });
});
