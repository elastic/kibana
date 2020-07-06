/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../../common/containers/source/mock';
import { TestProviders } from '../../../common/mock';
import { IS_OPERATOR, EXISTS_OPERATOR } from '../timeline/data_providers/data_provider';

import { StatefulEditDataProvider } from '.';

interface HasIsDisabled {
  isDisabled: boolean;
}

describe('StatefulEditDataProvider', () => {
  const field = 'client.address';
  const timelineId = 'test';
  const value = 'test-host';

  test('it renders the current field', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="field"]').first().text()).toEqual(field);
  });

  test('it renders the expected placeholder for the current field when field is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field=""
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="field"]').first().props().placeholder).toEqual(
      'Select a field'
    );
  });

  test('it renders the "is" operator in a humanized format', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="operator"]').first().text()).toEqual('is');
  });

  test('it renders the negated "is" operator in a humanized format when isExcluded is true', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="operator"]').first().text()).toEqual('is not');
  });

  test('it renders the "exists" operator in human-readable format', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="operator"]').first().text()).toEqual('exists');
  });

  test('it renders the negated "exists" operator in a humanized format when isExcluded is true', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="operator"]').first().text()).toEqual('does not exist');
  });

  test('it renders the current value when the operator is "is"', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="value"]').first().props().value).toEqual(value);
  });

  test('it renders the current value when the type of value is an array', () => {
    const reallyAnArray = ([value] as unknown) as string;

    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={reallyAnArray}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="value"]').first().props().value).toEqual(value);
  });

  test('it does NOT render the current value when the operator is "is not" (isExcluded is true)', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="value"]').first().props().value).toEqual(value);
  });

  test('it renders the expected placeholder when value is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value=""
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="value"]').first().props().placeholder).toEqual('value');
  });

  test('it does NOT render value when the operator is "exists"', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="value"]').exists()).toBe(false);
  });

  test('it does NOT render value when the operator is "not exists" (isExcluded is true)', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="value"]').exists()).toBe(false);
  });

  test('it does NOT disable the save button when field is valid', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    const props = wrapper.find('[data-test-subj="save"]').first().props() as HasIsDisabled;

    expect(props.isDisabled).toBe(false);
  });

  test('it disables the save button when field is invalid because it is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field=""
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    const props = wrapper.find('[data-test-subj="save"]').first().props() as HasIsDisabled;

    expect(props.isDisabled).toBe(true);
  });

  test('it disables the save button when field is invalid because it is not contained in the browser fields', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field="not-in-browser-fields"
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    const props = wrapper.find('[data-test-subj="save"]').first().props() as HasIsDisabled;

    expect(props.isDisabled).toBe(true);
  });

  test('it invokes onDataProviderEdited with the expected values when the user clicks the save button', () => {
    const onDataProviderEdited = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={onDataProviderEdited}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="save"]').first().simulate('click');

    wrapper.update();

    expect(onDataProviderEdited).toBeCalledWith({
      andProviderId: undefined,
      excluded: false,
      field: 'client.address',
      id: 'test',
      operator: ':',
      providerId: 'hosts-table-hostName-test-host',
      value: 'test-host',
    });
  });
});
