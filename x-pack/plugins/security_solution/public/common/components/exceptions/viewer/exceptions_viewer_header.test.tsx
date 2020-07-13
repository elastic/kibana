/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionsViewerHeader } from './exceptions_viewer_header';
import { ExceptionListTypeEnum } from '../../../../../public/lists_plugin_deps';

describe('ExceptionsViewerHeader', () => {
  it('it renders all disabled if "isInitLoading" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={true}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('input[data-test-subj="exceptionsHeaderSearch"]').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionsDetectionFilterBtn"] button').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionsEndpointFilterBtn"] button').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="exceptionsHeaderAddExceptionPopoverBtn"] button')
        .at(0)
        .prop('disabled')
    ).toBeTruthy();
  });

  it('it displays toggles and add exception popover when more than one list type available', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsFilterGroupBtns"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionPopoverBtn"]').exists()
    ).toBeTruthy();
  });

  it('it does not display toggles and add exception popover if only one list type is available', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsFilterGroupBtns"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionPopoverBtn"]')).toHaveLength(
      0
    );
  });

  it('it displays add exception button without popover if only one list type is available', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').exists()
    ).toBeTruthy();
  });

  it('it renders detections filter toggle selected when clicked', () => {
    const mockOnFilterChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={mockOnFilterChange}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsDetectionFilterBtn"] button').simulate('click');

    expect(
      wrapper
        .find('EuiFilterButton[data-test-subj="exceptionsDetectionFilterBtn"]')
        .at(0)
        .prop('hasActiveFilters')
    ).toBeTruthy();
    expect(
      wrapper
        .find('EuiFilterButton[data-test-subj="exceptionsEndpointFilterBtn"]')
        .at(0)
        .prop('hasActiveFilters')
    ).toBeFalsy();
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      filter: {
        filter: '',
        showDetectionsList: true,
        showEndpointList: false,
        tags: [],
      },
      pagination: {},
    });
  });

  it('it renders endpoint filter toggle selected and invokes "onFilterChange" when clicked', () => {
    const mockOnFilterChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={mockOnFilterChange}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsEndpointFilterBtn"] button').simulate('click');

    expect(
      wrapper
        .find('EuiFilterButton[data-test-subj="exceptionsEndpointFilterBtn"]')
        .at(0)
        .prop('hasActiveFilters')
    ).toBeTruthy();
    expect(
      wrapper
        .find('EuiFilterButton[data-test-subj="exceptionsDetectionFilterBtn"]')
        .at(0)
        .prop('hasActiveFilters')
    ).toBeFalsy();
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      filter: {
        filter: '',
        showDetectionsList: false,
        showEndpointList: true,
        tags: [],
      },
      pagination: {},
    });
  });

  it('it invokes "onAddExceptionClick" when user selects to add an exception item and only endpoint exception lists are available', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={mockOnAddExceptionClick}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');

    expect(mockOnAddExceptionClick).toHaveBeenCalledTimes(1);
  });

  it('it invokes "onAddDetectionsExceptionClick" when user selects to add an exception item and only endpoint detections lists are available', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={mockOnAddExceptionClick}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');

    expect(mockOnAddExceptionClick).toHaveBeenCalledTimes(1);
  });

  it('it invokes "onAddEndpointExceptionClick" when user selects to add an exception item to endpoint list from popover', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={mockOnAddExceptionClick}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="exceptionsHeaderAddExceptionPopoverBtn"] button')
      .simulate('click');
    wrapper.find('[data-test-subj="addEndpointExceptionBtn"] button').simulate('click');

    expect(mockOnAddExceptionClick).toHaveBeenCalledTimes(1);
  });

  it('it invokes "onAddDetectionsExceptionClick" when user selects to add an exception item to endpoint list from popover', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={jest.fn()}
          onAddExceptionClick={mockOnAddExceptionClick}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="exceptionsHeaderAddExceptionPopoverBtn"] button')
      .simulate('click');
    wrapper.find('[data-test-subj="addDetectionsExceptionBtn"] button').simulate('click');

    expect(mockOnAddExceptionClick).toHaveBeenCalledTimes(1);
  });

  it('it invokes "onFilterChange" when search used and "Enter" pressed', () => {
    const mockOnFilterChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          supportedListTypes={[ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.ENDPOINT]}
          isInitLoading={false}
          detectionsListItems={0}
          endpointListItems={0}
          onFilterChange={mockOnFilterChange}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('EuiFieldSearch').at(0).simulate('keyup', {
      charCode: 13,
      code: 'Enter',
      key: 'Enter',
    });

    expect(mockOnFilterChange).toHaveBeenCalled();
  });
});
