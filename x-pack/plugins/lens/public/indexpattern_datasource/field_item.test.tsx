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
import { IndexPattern } from '../types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { documentField } from './document_field';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { loadFieldStats } from '@kbn/unified-field-list-plugin/public';
import { DOCUMENT_FIELD_NAME } from '../../common';

jest.mock('@kbn/unified-field-list-plugin/public/services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({}),
}));

const chartsThemeService = chartPluginMock.createSetupContract().theme;

const clickField = async (wrapper: ReactWrapper, field: string) => {
  await act(async () => {
    wrapper.find(`[data-test-subj="lnsFieldListPanelField-${field}"] button`).simulate('click');
  });
};

const mockedServices = {
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  charts: chartPluginMock.createSetupContract(),
  uiSettings: coreMock.createStart().uiSettings,
};

const InnerFieldItemWrapper: React.FC<FieldItemProps> = (props) => {
  return (
    <KibanaContextProvider services={mockedServices}>
      <InnerFieldItem {...props} />
    </KibanaContextProvider>
  );
};

describe('IndexPattern Field Item', () => {
  let defaultProps: FieldItemProps;
  let indexPattern: IndexPattern;
  let dataView: DataView;

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

    defaultProps = {
      indexPattern,
      fieldFormats: {
        ...fieldFormatsServiceMock.createStartContract(),
        getDefaultInstance: jest.fn(() => ({
          convert: jest.fn((s: unknown) => JSON.stringify(s)),
        })),
      } as unknown as FieldFormatsStart,
      core: coreMock.createStart(),
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

    dataView = {
      ...indexPattern,
      getFormatterForField: defaultProps.fieldFormats.getDefaultInstance,
    } as unknown as DataView;

    (mockedServices.dataViews.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve(dataView);
    });
  });

  it('should display displayName of a field', () => {
    const wrapper = mountWithIntl(<InnerFieldItemWrapper {...defaultProps} />);

    // Using .toContain over .toEqual because this element includes text from <EuiScreenReaderOnly>
    // which can't be seen, but shows in the text content
    expect(wrapper.find('[data-test-subj="lnsFieldListPanelField"]').first().text()).toContain(
      'bytesLabel'
    );
  });

  it('should render edit field button if callback is set', async () => {
    const editFieldSpy = jest.fn();
    const wrapper = mountWithIntl(
      <InnerFieldItemWrapper {...defaultProps} editField={editFieldSpy} hideDetails />
    );
    await clickField(wrapper, 'bytes');
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

  it('should not render edit field button for document field', async () => {
    const editFieldSpy = jest.fn();
    const wrapper = mountWithIntl(
      <InnerFieldItemWrapper
        {...defaultProps}
        field={documentField}
        editField={editFieldSpy}
        hideDetails
      />
    );
    await clickField(wrapper, documentField.name);
    wrapper.update();
    const popoverContent = wrapper.find(EuiPopover).prop('children');
    expect(
      mountWithIntl(popoverContent as ReactElement)
        .find('[data-test-subj="lnsFieldListPanelEdit"]')
        .exists()
    ).toBeFalsy();
  });

  it('should request field stats every time the button is clicked', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = mountWithIntl(<InnerFieldItemWrapper {...defaultProps} />);

    await clickField(wrapper, 'bytes');

    await wrapper.update();

    expect(loadFieldStats).toHaveBeenCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
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
      field: defaultProps.field,
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

    await wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);

    await clickField(wrapper, 'bytes');

    await wrapper.update();

    expect(loadFieldStats).toHaveBeenCalledTimes(1);

    act(() => {
      const closePopover = wrapper.find(EuiPopover).prop('closePopover');

      closePopover();
    });

    await wrapper.update();

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

    await clickField(wrapper, 'bytes');

    await wrapper.update();

    expect(loadFieldStats).toHaveBeenCalledTimes(2);
    expect(loadFieldStats).toHaveBeenLastCalledWith({
      abortController: new AbortController(),
      services: { data: mockedServices.data },
      dataView,
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
      field: defaultProps.field,
    });

    (loadFieldStats as jest.Mock).mockReset();
    (loadFieldStats as jest.Mock).mockImplementation(() => Promise.resolve({}));
  });

  it('should not request field stats for document field', async () => {
    const wrapper = mountWithIntl(
      <InnerFieldItemWrapper {...defaultProps} field={documentField} />
    );

    await clickField(wrapper, DOCUMENT_FIELD_NAME);

    await wrapper.update();

    expect(loadFieldStats).not.toHaveBeenCalled();
    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
  });

  it('should not request field stats for range fields', async () => {
    const wrapper = mountWithIntl(
      <InnerFieldItemWrapper
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

    await clickField(wrapper, 'ip_range');

    expect(loadFieldStats).not.toHaveBeenCalled();
  });
});
