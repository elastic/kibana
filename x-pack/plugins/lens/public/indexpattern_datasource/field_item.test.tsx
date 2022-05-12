/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import { InnerFieldItem, FieldItemProps } from './field_item';
import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { IndexPattern } from './types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { documentField } from './document_field';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DOCUMENT_FIELD_NAME } from '../../common';

const chartsThemeService = chartPluginMock.createSetupContract().theme;

function clickField(wrapper: ReactWrapper, field: string) {
  wrapper.find(`[data-test-subj="lnsFieldListPanelField-${field}"] button`).simulate('click');
}

describe('IndexPattern Field Item', () => {
  let defaultProps: FieldItemProps;
  let indexPattern: IndexPattern;
  let core: ReturnType<typeof coreMock['createSetup']>;

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
        {
          name: 'ip_range',
          displayName: 'ip_range',
          type: 'ip_range',
          aggregatable: true,
          searchable: true,
        },
        documentField,
      ],
    } as IndexPattern;

    core = coreMock.createSetup();
    core.http.post.mockClear();
    defaultProps = {
      indexPattern,
      fieldFormats: {
        ...fieldFormatsServiceMock.createStartContract(),
        getDefaultInstance: jest.fn(() => ({
          convert: jest.fn((s: unknown) => JSON.stringify(s)),
        })),
      } as unknown as FieldFormatsStart,
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
      uiActions: uiActionsPluginMock.createStartContract(),
    };
  });

  it('should display displayName of a field', () => {
    const wrapper = mountWithIntl(<InnerFieldItem {...defaultProps} />);

    // Using .toContain over .toEqual because this element includes text from <EuiScreenReaderOnly>
    // which can't be seen, but shows in the text content
    expect(wrapper.find('[data-test-subj="lnsFieldListPanelField"]').first().text()).toContain(
      'bytesLabel'
    );
  });

  it('should render edit field button if callback is set', () => {
    core.http.post.mockImplementation(() => {
      return new Promise(() => {});
    });
    const editFieldSpy = jest.fn();
    const wrapper = mountWithIntl(
      <InnerFieldItem {...defaultProps} editField={editFieldSpy} hideDetails />
    );
    clickField(wrapper, 'bytes');
    wrapper.update();
    const popoverContent = wrapper.find(EuiPopover).prop('children');
    act(() => {
      mountWithIntl(popoverContent as ReactElement)
        .find('[data-test-subj="lnsFieldListPanelEdit"]')
        .first()
        .simulate('click');
    });
    expect(editFieldSpy).toHaveBeenCalledWith('bytes');
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
            must: [],
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
            query: { match: { phrase: { 'geo.dest': 'US' } } },
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

  it('should not request field stats for document field', async () => {
    const wrapper = mountWithIntl(<InnerFieldItem {...defaultProps} field={documentField} />);

    clickField(wrapper, DOCUMENT_FIELD_NAME);

    expect(core.http.post).not.toHaveBeenCalled();
    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
  });

  it('should not request field stats for range fields', async () => {
    const wrapper = mountWithIntl(
      <InnerFieldItem
        {...defaultProps}
        field={{
          name: 'ip_range',
          displayName: 'ip_range',
          type: 'ip_range',
          aggregatable: true,
          searchable: true,
        }}
      />
    );

    await act(async () => {
      clickField(wrapper, 'ip_range');
    });

    expect(core.http.post).not.toHaveBeenCalled();
  });
});
