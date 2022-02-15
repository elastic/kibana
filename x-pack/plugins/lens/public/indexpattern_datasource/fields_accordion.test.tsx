/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiNotificationBadge } from '@elastic/eui';
import { coreMock } from 'src/core/public/mocks';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';
import { IndexPattern } from './types';
import { FieldItem } from './field_item';
import { FieldsAccordion, FieldsAccordionProps, FieldItemSharedProps } from './fields_accordion';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { uiActionsPluginMock } from '../../../../../src/plugins/ui_actions/public/mocks';

describe('Fields Accordion', () => {
  let defaultProps: FieldsAccordionProps;
  let indexPattern: IndexPattern;
  let core: ReturnType<typeof coreMock['createSetup']>;
  let fieldProps: FieldItemSharedProps;

  beforeEach(() => {
    indexPattern = {
      id: '1',
      title: 'my-fake-index-pattern',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
      ],
    } as IndexPattern;
    core = coreMock.createSetup();
    core.http.post.mockClear();

    fieldProps = {
      indexPattern,
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      core,
      highlight: '',
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      query: { query: '', language: 'lucene' },
      filters: [],
      chartsThemeService: chartPluginMock.createSetupContract().theme,
    };

    defaultProps = {
      initialIsOpen: true,
      onToggle: jest.fn(),
      id: 'id',
      label: 'label',
      hasLoaded: true,
      fieldsCount: 2,
      isFiltered: false,
      paginatedFields: indexPattern.fields,
      fieldProps,
      renderCallout: <div id="lens-test-callout">Callout</div>,
      exists: () => true,
      groupIndex: 0,
      dropOntoWorkspace: () => {},
      hasSuggestionForField: () => false,
      uiActions: uiActionsPluginMock.createStartContract(),
    };
  });

  it('renders correct number of Field Items', () => {
    const wrapper = mountWithIntl(
      <FieldsAccordion {...defaultProps} exists={(field) => field.name === 'timestamp'} />
    );
    expect(wrapper.find(FieldItem).at(0).prop('exists')).toEqual(true);
    expect(wrapper.find(FieldItem).at(1).prop('exists')).toEqual(false);
  });

  it('passed correct exists flag to each field', () => {
    const wrapper = mountWithIntl(<FieldsAccordion {...defaultProps} />);
    expect(wrapper.find(FieldItem).length).toEqual(2);
  });

  it('renders callout if no fields', () => {
    const wrapper = shallowWithIntl(
      <FieldsAccordion {...defaultProps} fieldsCount={0} paginatedFields={[]} />
    );
    expect(wrapper.find('#lens-test-callout').length).toEqual(1);
  });

  it('renders accented notificationBadge state if isFiltered', () => {
    const wrapper = mountWithIntl(<FieldsAccordion {...defaultProps} isFiltered={true} />);
    expect(wrapper.find(EuiNotificationBadge).prop('color')).toEqual('accent');
  });

  it('renders spinner if has not loaded', () => {
    const wrapper = mountWithIntl(<FieldsAccordion {...defaultProps} hasLoaded={false} />);
    expect(wrapper.find(EuiLoadingSpinner).length).toEqual(1);
  });
});
