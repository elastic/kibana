/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { cloneDeep } from 'lodash/fp';

import { InspectButton, InspectButtonContainer, BUTTON_CLASS, InspectButtonProps } from '.';

describe('Inspect Button', () => {
  const newQuery: InspectButtonProps = {
    inspect: null,
    loading: false,
    title: 'My title',
  };

  describe('Render', () => {
    test('Eui Icon Button', () => {
      const wrapper = mount(<InspectButton {...newQuery} />);
      expect(wrapper.find('button[data-test-subj="inspect-icon-button"]').first().exists()).toBe(
        true
      );
    });

    test('Eui Icon Button disabled', () => {
      const wrapper = mount(<InspectButton isDisabled={true} {...newQuery} />);
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    describe('InspectButtonContainer', () => {
      test('it renders a transparent inspect button by default', async () => {
        const wrapper = mount(
          <InspectButtonContainer>
            <InspectButton {...newQuery} />
          </InspectButtonContainer>
        );

        expect(wrapper.find(`InspectButtonContainer`)).toHaveStyleRule('opacity', '0', {
          modifier: `.${BUTTON_CLASS}`,
        });
      });

      test('it renders an opaque inspect button when it has mouse focus', async () => {
        const wrapper = mount(
          <InspectButtonContainer>
            <InspectButton {...newQuery} />
          </InspectButtonContainer>
        );

        expect(wrapper.find(`InspectButtonContainer`)).toHaveStyleRule('opacity', '1', {
          modifier: `:hover .${BUTTON_CLASS}`,
        });
      });
    });
  });

  describe('Modal Inspect - happy path', () => {
    const myQuery = cloneDeep(newQuery);
    beforeEach(() => {
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: ['my response'],
      };
    });
    test('Open Inspect Modal', () => {
      const wrapper = mount(<InspectButton {...myQuery} />);

      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');
      wrapper.update();
      expect(wrapper.find('button[data-test-subj="modal-inspect-close"]').first().exists()).toBe(
        true
      );
    });

    test('Close Inspect Modal', () => {
      const wrapper = mount(<InspectButton {...myQuery} />);
      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');

      wrapper.update();
      wrapper.find('button[data-test-subj="modal-inspect-close"]').first().simulate('click');

      wrapper.update();
      expect(wrapper.find('button[data-test-subj="modal-inspect-close"]').first().exists()).toBe(
        false
      );
    });

    test('Do not Open Inspect Modal if it is loading', () => {
      const wrapper = mount(
        <InspectButton title={myQuery.title} inspect={myQuery.inspect} loading={true} />
      );
      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');

      wrapper.update();

      expect(wrapper.find('button[data-test-subj="modal-inspect-close"]').first().exists()).toBe(
        false
      );
    });
  });
});
