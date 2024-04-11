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
import { InnerFieldItem, FieldItemIndexPatternFieldProps } from './field_item';
import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { IndexPattern } from '../../types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { documentField } from '../form_based/document_field';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import loadFieldStatsModule from '@kbn/unified-field-list/src/services/field_stats';
import { FieldIcon } from '@kbn/field-utils';
import { FieldStats, FieldPopoverFooter } from '@kbn/unified-field-list';

jest.mock('@kbn/unified-field-list/src/services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({}),
}));

const clickField = async (wrapper: ReactWrapper, field?: string) => {
  await act(async () => {
    await wrapper
      .find(`[data-test-subj="lnsFieldListPanelField-${field}"] .kbnFieldButton__button`)
      .simulate('click');
  });
};

const mockedServices = {
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  charts: chartPluginMock.createSetupContract(),
  uiActions: uiActionsPluginMock.createStartContract(),
  uiSettings: coreMock.createStart().uiSettings,
  share: {
    url: {
      locators: {
        get: jest.fn().mockReturnValue({
          getRedirectUrl: jest.fn(() => 'discover_url'),
        }),
      },
    },
  },
  application: {
    capabilities: {
      discover: { save: true, saveQuery: true, show: true },
    },
  },
};

const InnerFieldItemWrapper: React.FC<FieldItemIndexPatternFieldProps> = (props) => {
  return (
    <KibanaContextProvider services={mockedServices}>
      <InnerFieldItem {...props} />
    </KibanaContextProvider>
  );
};

async function getComponent(props: FieldItemIndexPatternFieldProps) {
  const instance = await mountWithIntl(<InnerFieldItemWrapper {...props} />);
  // wait for lazy modules
  await new Promise((resolve) => setTimeout(resolve, 0));
  await instance.update();
  return instance;
}

describe('Lens Field Item', () => {
  let defaultProps: FieldItemIndexPatternFieldProps;
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
          displayName: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'bytes',
          displayName: 'bytes',
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
        {
          name: 'geo.coordinates',
          displayName: 'geo.coordinates',
          type: 'geo_shape',
          aggregatable: true,
          searchable: true,
        },
        documentField,
      ],
      isTimeBased: jest.fn(),
    } as unknown as IndexPattern;

    defaultProps = {
      indexPattern,
      highlight: '',
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      query: { query: '', language: 'lucene' },
      filters: [],
      field: {
        name: 'bytes',
        displayName: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      exists: true,
      groupIndex: 0,
      itemIndex: 0,
      dropOntoWorkspace: () => {},
      hasSuggestionForField: () => false,
    };

    dataView = {
      ...indexPattern,
      getFormatterForField: jest.fn(() => ({
        convert: jest.fn((s: unknown) => JSON.stringify(s)),
      })),
    } as unknown as DataView;

    (mockedServices.dataViews.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve(dataView);
    });
  });

  beforeEach(() => {
    (loadFieldStatsModule.loadFieldStats as jest.Mock).mockReset();
    (loadFieldStatsModule.loadFieldStats as jest.Mock).mockImplementation(() =>
      Promise.resolve({})
    );
  });

  it('should display displayName of a field', async () => {
    const wrapper = await getComponent(defaultProps);

    // Using .toContain over .toEqual because this element includes text from <EuiScreenReaderOnly>
    // which can't be seen, but shows in the text content
    expect(wrapper.find('[data-test-subj="lnsFieldListPanelField"]').first().text()).toContain(
      'bytes'
    );
  });

  it('should show gauge icon for gauge fields', async () => {
    const wrapper = await getComponent({
      ...defaultProps,
      field: { ...defaultProps.field, timeSeriesMetric: 'gauge' },
    });

    // Using .toContain over .toEqual because this element includes text from <EuiScreenReaderOnly>
    // which can't be seen, but shows in the text content
    expect(wrapper.find(FieldIcon).first().prop('type')).toEqual('gauge');
  });

  it('should render edit field button if callback is set', async () => {
    const editFieldSpy = jest.fn();
    const wrapper = await getComponent({
      ...defaultProps,
      editField: editFieldSpy,
      hideDetails: true,
    });
    await clickField(wrapper, 'bytes');
    await wrapper.update();
    const popoverContent = wrapper.find(EuiPopover).prop('children');
    act(() => {
      mountWithIntl(
        <KibanaContextProvider services={mockedServices}>
          {popoverContent as ReactElement}
        </KibanaContextProvider>
      )
        .find('[data-test-subj="fieldPopoverHeader_editField-bytes"]')
        .first()
        .simulate('click');
    });
    expect(editFieldSpy).toHaveBeenCalledWith('bytes');
  });

  it('should not render edit field button for document field', async () => {
    const editFieldSpy = jest.fn();
    const wrapper = await getComponent({
      ...defaultProps,
      field: documentField,
      editField: editFieldSpy,
      hideDetails: true,
    });
    await clickField(wrapper, documentField.name);
    await wrapper.update();
    const popoverContent = wrapper.find(EuiPopover).prop('children');
    expect(
      mountWithIntl(
        <KibanaContextProvider services={mockedServices}>
          {popoverContent as ReactElement}
        </KibanaContextProvider>
      )
        .find('[data-test-subj="fieldPopoverHeader_editField-bytes"]')
        .exists()
    ).toBeFalsy();
  });

  it('should pass add filter callback and pass result to filter manager', async () => {
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStatsModule.loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const field = {
      name: 'test',
      displayName: 'test',
      type: 'string',
      aggregatable: true,
      searchable: true,
      filterable: true,
    };

    const editFieldSpy = jest.fn();
    const wrapper = await getComponent({
      ...defaultProps,
      field,
      editField: editFieldSpy,
    });

    await clickField(wrapper, field.name);
    await wrapper.update();

    await act(async () => {
      resolveFunction!({
        totalDocuments: 4633,
        sampledDocuments: 4633,
        sampledValues: 4633,
        topValues: {
          buckets: [{ count: 147, key: 'abc' }],
        },
      });
    });

    await wrapper.update();

    wrapper.find(`[data-test-subj="plus-${field.name}-abc"]`).first().simulate('click');

    expect(mockedServices.data.query.filterManager.addFilters).toHaveBeenCalledWith([
      expect.objectContaining({ query: { match_phrase: { test: 'abc' } } }),
    ]);
  });

  it('should request field stats every time the button is clicked', async () => {
    const dataViewField = new DataViewField(defaultProps.field);
    let resolveFunction: (arg: unknown) => void;

    (loadFieldStatsModule.loadFieldStats as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFunction = resolve;
      });
    });

    const wrapper = await getComponent(defaultProps);

    await clickField(wrapper, 'bytes');

    await wrapper.update();

    expect(loadFieldStatsModule.loadFieldStats).toHaveBeenCalledWith({
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
      field: dataViewField,
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

    expect(loadFieldStatsModule.loadFieldStats).toHaveBeenCalledTimes(1);

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

    expect(loadFieldStatsModule.loadFieldStats).toHaveBeenCalledTimes(2);
    expect(loadFieldStatsModule.loadFieldStats).toHaveBeenLastCalledWith({
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
      field: dataViewField,
    });
  });

  it('should not request field stats for document field', async () => {
    const wrapper = await getComponent({
      ...defaultProps,
      field: documentField,
    });

    await clickField(wrapper, documentField.name);

    await wrapper.update();

    expect(loadFieldStatsModule.loadFieldStats).toHaveBeenCalled();
    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(FieldStats).text()).toBe('Analysis is not available for this field.');
  });

  it('should not request field stats for range fields', async () => {
    const wrapper = await getComponent({
      ...defaultProps,
      field: {
        name: 'ip_range',
        displayName: 'ip_range',
        type: 'ip_range',
        aggregatable: true,
        searchable: true,
      },
    });

    await clickField(wrapper, 'ip_range');

    await wrapper.update();

    expect(loadFieldStatsModule.loadFieldStats).toHaveBeenCalled();
    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(FieldStats).text()).toBe('Analysis is not available for this field.');
    expect(wrapper.find(FieldPopoverFooter).exists()).toBeFalsy();
  });

  it('should request examples for geo fields and render Visualize button', async () => {
    const wrapper = await getComponent({
      ...defaultProps,
      field: {
        name: 'geo.coordinates',
        displayName: 'geo.coordinates',
        type: 'geo_shape',
        aggregatable: true,
        searchable: true,
      },
    });

    await clickField(wrapper, 'geo.coordinates');

    await wrapper.update();

    expect(loadFieldStatsModule.loadFieldStats).toHaveBeenCalled();
    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(FieldStats).text()).toBe(
      'Lens is unable to create visualizations with this field because it does not contain data. To create a visualization, drag and drop a different field.'
    );
    expect(wrapper.find(FieldPopoverFooter).exists()).toBeTruthy();
  });

  it('should display Explore in discover button', async () => {
    const wrapper = await mountWithIntl(<InnerFieldItemWrapper {...defaultProps} />);

    await clickField(wrapper, 'bytes');

    await wrapper.update();

    const exploreInDiscoverBtn = findTestSubject(
      wrapper,
      'lnsFieldListPanel-exploreInDiscover-bytes'
    );
    expect(exploreInDiscoverBtn.length).toBe(1);
  });

  it('should not display Explore in discover button for a geo_point field', async () => {
    const wrapper = await mountWithIntl(
      <InnerFieldItemWrapper
        {...defaultProps}
        field={{
          name: 'geo_point',
          displayName: 'geo_point',
          type: 'geo_point',
          aggregatable: true,
          searchable: true,
        }}
      />
    );

    await clickField(wrapper, 'geo_point');

    await wrapper.update();

    const exploreInDiscoverBtn = findTestSubject(
      wrapper,
      'lnsFieldListPanel-exploreInDiscover-geo_point'
    );
    expect(exploreInDiscoverBtn.length).toBe(0);
  });

  it('should not display Explore in discover button if discover capabilities show is false', async () => {
    const services = {
      ...mockedServices,
      application: {
        capabilities: {
          discover: { save: false, saveQuery: false, show: false },
        },
      },
    };
    const wrapper = await mountWithIntl(
      <KibanaContextProvider services={services}>
        <InnerFieldItem {...defaultProps} />
      </KibanaContextProvider>
    );

    await clickField(wrapper, 'bytes');

    await wrapper.update();

    const exploreInDiscoverBtn = findTestSubject(
      wrapper,
      'lnsFieldListPanel-exploreInDiscover-bytes'
    );
    expect(exploreInDiscoverBtn.length).toBe(0);
  });
});
