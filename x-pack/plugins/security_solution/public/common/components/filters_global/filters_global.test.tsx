/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper, shallow } from 'enzyme';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import '../../mock/match_media';
import { FiltersGlobal } from './filters_global';
import { TestProviders } from '../../mock/test_providers';

describe('rendering', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <FiltersGlobal globalFullScreen={false}>
        <p>{'Additional filters here.'}</p>
      </FiltersGlobal>
    );

    expect(wrapper).toMatchSnapshot();
  });

  describe('full screen mode', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders>
          <StickyContainer>
            <FiltersGlobal globalFullScreen={true}>
              <p>{'Filter content'}</p>
            </FiltersGlobal>
          </StickyContainer>
        </TestProviders>
      );
    });

    test('it does NOT render the sticky container', () => {
      expect(wrapper.find('[data-test-subj="sticky-filters-global-container"]').exists()).toBe(
        false
      );
    });

    test('it renders the non-sticky container', () => {
      expect(wrapper.find('[data-test-subj="non-sticky-global-container"]').exists()).toBe(true);
    });

    test('it does NOT render the container with a `display: none` style when `show` is true (the default)', () => {
      expect(
        wrapper.find('[data-test-subj="non-sticky-global-container"]').first()
      ).not.toHaveStyleRule('display', 'none');
    });
  });

  describe('non-full screen mode', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders>
          <StickyContainer>
            <FiltersGlobal globalFullScreen={false}>
              <p>{'Filter content'}</p>
            </FiltersGlobal>
          </StickyContainer>
        </TestProviders>
      );
    });

    test('it renders the sticky container', () => {
      expect(wrapper.find('[data-test-subj="sticky-filters-global-container"]').exists()).toBe(
        true
      );
    });

    test('it does NOT render the non-sticky container', () => {
      expect(wrapper.find('[data-test-subj="non-sticky-global-container"]').exists()).toBe(false);
    });

    test('it does NOT render the container with a `display: none` style when `show` is true (the default)', () => {
      expect(
        wrapper.find('[data-test-subj="sticky-filters-global-container"]').first()
      ).not.toHaveStyleRule('display', 'none');
    });
  });

  describe('when show is false', () => {
    test('in full screen mode it renders the container with a `display: none` style', () => {
      const wrapper = mount(
        <TestProviders>
          <StickyContainer>
            <FiltersGlobal globalFullScreen={true} show={false}>
              <p>{'Filter content'}</p>
            </FiltersGlobal>
          </StickyContainer>
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="non-sticky-global-container"]').first()
      ).toHaveStyleRule('display', 'none');
    });

    test('in non-full screen mode it renders the container with a `display: none` style', () => {
      const wrapper = mount(
        <TestProviders>
          <StickyContainer>
            <FiltersGlobal globalFullScreen={false} show={false}>
              <p>{'Filter content'}</p>
            </FiltersGlobal>
          </StickyContainer>
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="sticky-filters-global-container"]').first()
      ).toHaveStyleRule('display', 'none');
    });
  });
});
