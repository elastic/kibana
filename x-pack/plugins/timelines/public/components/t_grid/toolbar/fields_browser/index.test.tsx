/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';

import { mockBrowserFields, TestProviders } from '../../../../mock';

import { FIELD_BROWSER_WIDTH } from './helpers';

import { StatefulFieldsBrowserComponent } from '.';

describe('StatefulFieldsBrowser', () => {
  const timelineId = 'test';

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  test('it renders the Fields button, which displays the fields browser on click', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="show-field-browser"]').exists()).toBe(true);
  });

  describe('toggleShow', () => {
    test('it does NOT render the fields browser until the Fields button is clicked', () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="fields-browser-container"]').exists()).toBe(false);
    });

    test('it renders the fields browser when the Fields button is clicked', () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="show-field-browser"]').first().simulate('click');

      expect(wrapper.find('[data-test-subj="fields-browser-container"]').exists()).toBe(true);
    });
  });

  describe('updateSelectedCategoryId', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    test('it updates the selectedCategoryId state, which makes the category bold, when the user clicks a category name in the left hand side of the field browser', async () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="show-field-browser"]').first().simulate('click');

      wrapper.find(`.field-browser-category-pane-auditd-${timelineId}`).first().simulate('click');
      await waitFor(() => {
        wrapper.update();
        expect(
          wrapper
            .find(`.field-browser-category-pane-auditd-${timelineId}`)
            .find('[data-test-subj="categoryName"]')
            .at(1)
        ).toHaveStyleRule('font-weight', 'bold', { modifier: '.euiText' });
      });
    });

    test('it updates the selectedCategoryId state according to most fields returned', async () => {
      const wrapper = mount(
        <TestProviders>
          <StatefulFieldsBrowserComponent
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.find('[data-test-subj="show-field-browser"]').first().simulate('click');
        jest.runOnlyPendingTimers();
        wrapper.update();

        expect(
          wrapper
            .find(`.field-browser-category-pane-cloud-${timelineId}`)
            .find('[data-test-subj="categoryName"]')
            .at(1)
        ).toHaveStyleRule('font-weight', 'normal', { modifier: '.euiText' });
      });

      await waitFor(() => {
        wrapper
          .find('[data-test-subj="field-search"]')
          .last()
          .simulate('change', { target: { value: 'cloud' } });

        jest.runOnlyPendingTimers();
        wrapper.update();
        expect(
          wrapper
            .find(`.field-browser-category-pane-cloud-${timelineId}`)
            .find('[data-test-subj="categoryName"]')
            .at(1)
        ).toHaveStyleRule('font-weight', 'bold', { modifier: '.euiText' });
      });
    });
  });

  test('it renders the Fields Browser button as a settings gear when the isEventViewer prop is true', () => {
    const isEventViewer = true;

    const wrapper = mount(
      <TestProviders>
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          isEventViewer={isEventViewer}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="show-field-browser"]').first().exists()).toBe(true);
  });

  test('it renders the Fields Browser button as a settings gear when the isEventViewer prop is false', () => {
    const isEventViewer = true;

    const wrapper = mount(
      <TestProviders>
        <StatefulFieldsBrowserComponent
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          isEventViewer={isEventViewer}
          timelineId={timelineId}
          width={FIELD_BROWSER_WIDTH}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="show-field-browser"]').first().exists()).toBe(true);
  });
});
