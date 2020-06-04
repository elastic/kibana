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
import { ToggleId } from '../types';

describe('ExceptionsViewerHeader', () => {
  it('it renders all disabled if "isInitLoading" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.DETECTION_ENGINE}
          isInitLoading={true}
          listTypes={[]}
          onFiltersChange={jest.fn()}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('input[data-test-subj="exceptionsHeaderSearch"]').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionsHeaderListToggle"] button').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="exceptionsHeaderListToggle"] button').at(1).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button')
        .at(0)
        .prop('disabled')
    ).toBeTruthy();
  });

  it('it disables Endpoint toggle when only Detections list available', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.DETECTION_ENGINE}
          isInitLoading={false}
          listTypes={[ToggleId.DETECTION_ENGINE]}
          onFiltersChange={jest.fn()}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('input[data-test-subj="detectionsToggle"]').at(0).prop('disabled')
    ).toBeFalsy();
    expect(
      wrapper.find('input[data-test-subj="detectionsToggle"]').at(0).prop('checked')
    ).toBeTruthy();
    expect(
      wrapper.find('input[data-test-subj="endpointToggle"]').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper.find('input[data-test-subj="endpointToggle"]').at(0).prop('checked')
    ).toBeFalsy();
  });

  it('it disables Detections toggle when only Endpoint list available', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.ENDPOINT}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT]}
          onFiltersChange={jest.fn()}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('input[data-test-subj="detectionsToggle"]').at(0).prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper.find('input[data-test-subj="detectionsToggle"]').at(0).prop('checked')
    ).toBeFalsy();
    expect(
      wrapper.find('input[data-test-subj="endpointToggle"]').at(0).prop('disabled')
    ).toBeFalsy();
    expect(
      wrapper.find('input[data-test-subj="endpointToggle"]').at(0).prop('checked')
    ).toBeTruthy();
  });

  it('it renders Detections toggle selected when "selectedListType" is detections', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.DETECTION_ENGINE}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={jest.fn()}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('input[data-test-subj="detectionsToggle"]').at(0).prop('checked')
    ).toBeTruthy();
  });

  it('it renders Endpoint toggle selected when "selectedListType" is endpoint', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.ENDPOINT}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={jest.fn()}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper.find('input[data-test-subj="endpointToggle"]').at(0).prop('checked')
    ).toBeTruthy();
  });

  it('it invokes "onToggleListType" with appropriate toggle value on click', () => {
    const mockOnToggleListType = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.DETECTION_ENGINE}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={jest.fn()}
          onToggleListType={mockOnToggleListType}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('input[data-test-subj="endpointToggle"]').simulate('change', {
      target: { value: 'endpoint' },
    });

    expect(mockOnToggleListType).toHaveBeenCalledWith('endpoint');

    wrapper.find('input[data-test-subj="detectionsToggle"]').simulate('change', {
      target: { value: 'detection' },
    });

    expect(mockOnToggleListType).toHaveBeenCalledWith('detection');
  });

  it('it invokes "onAddExceptionClick" with value "endpoint" when add exception to endpoint list clicked', () => {
    const mockAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.ENDPOINT}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={jest.fn()}
          onToggleListType={jest.fn()}
          onAddExceptionClick={mockAddExceptionClick}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');
    wrapper.find('[data-test-subj="addEndpointExceptionBtn"] button').simulate('click');

    expect(mockAddExceptionClick).toHaveBeenCalledWith('endpoint');
  });

  it('it invokes "onAddExceptionClick" with value "detection" when add exception to detections list clicked', () => {
    const mockAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.ENDPOINT}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={jest.fn()}
          onToggleListType={jest.fn()}
          onAddExceptionClick={mockAddExceptionClick}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');
    wrapper.find('[data-test-subj="addDetectionsExceptionBtn"] button').simulate('click');

    expect(mockAddExceptionClick).toHaveBeenCalledWith('detection');
  });

  it('it invokes "onFiltersChange" with filter value "host" when "host" searched', () => {
    const mockOnFiltersChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.ENDPOINT}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={mockOnFiltersChange}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper
      .find('input[data-test-subj="exceptionsHeaderSearch"]')
      .at(0)
      .simulate('change', {
        target: { value: 'host' },
      });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ filter: 'host', tags: [] });
  });

  it('it invokes "onFiltersChange" with tags value when tags searched', () => {
    const mockOnFiltersChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.ENDPOINT}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={mockOnFiltersChange}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper
      .find('input[data-test-subj="exceptionsHeaderSearch"]')
      .at(0)
      .simulate('change', {
        target: { value: 'tags:malware' },
      });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ filter: '', tags: ['malware'] });
  });

  it('it invokes "onFiltersChange" with tags and filter value when tags and fields searched', () => {
    const mockOnFiltersChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerHeader
          selectedListType={ToggleId.ENDPOINT}
          isInitLoading={false}
          listTypes={[ToggleId.ENDPOINT, ToggleId.DETECTION_ENGINE]}
          onFiltersChange={mockOnFiltersChange}
          onToggleListType={jest.fn()}
          onAddExceptionClick={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper
      .find('input[data-test-subj="exceptionsHeaderSearch"]')
      .at(0)
      .simulate('change', {
        target: { value: 'host.name tags:malware' },
      });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ filter: 'host.name', tags: ['malware'] });
  });
});
