/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import {
  TestProviderWithoutDragAndDrop,
  mockGlobalState,
  apolloClientObservable,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../mock';
import { createStore, State } from '../../store';
import { UpdateQueryParams, upsertQuery } from '../../store/inputs/helpers';

import { InspectButton, InspectButtonContainer, BUTTON_CLASS } from '.';
import { cloneDeep } from 'lodash/fp';

describe('Inspect Button', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const refetch = jest.fn();
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const newQuery: UpdateQueryParams = {
    inputId: 'global',
    id: 'myQuery',
    inspect: null,
    loading: false,
    refetch,
    state: state.inputs,
  };

  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  describe('Render', () => {
    beforeEach(() => {
      const myState = cloneDeep(state);
      myState.inputs = upsertQuery(newQuery);
      store = createStore(
        myState,
        SUB_PLUGINS_REDUCER,
        apolloClientObservable,
        kibanaObservable,
        storage
      );
    });
    test('Eui Empty Button', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} inputId="timeline" title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('button[data-test-subj="inspect-empty-button"]').first().exists()).toBe(
        true
      );
    });

    test('it does NOT render the Eui Empty Button when timeline is timeline and compact is true', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton compact={true} queryId={newQuery.id} inputId="timeline" title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('button[data-test-subj="inspect-empty-button"]').first().exists()).toBe(
        false
      );
    });

    test('Eui Icon Button', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('button[data-test-subj="inspect-icon-button"]').first().exists()).toBe(
        true
      );
    });

    test('renders the Icon Button when inputId does NOT equal global, but compact is true', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton compact={true} inputId="timeline" queryId={newQuery.id} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('button[data-test-subj="inspect-icon-button"]').first().exists()).toBe(
        true
      );
    });

    test('Eui Empty Button disabled', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    test('Eui Icon Button disabled', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    describe('InspectButtonContainer', () => {
      test('it renders a transparent inspect button by default', async () => {
        const wrapper = mount(
          <TestProviderWithoutDragAndDrop store={store}>
            <InspectButtonContainer>
              <InspectButton queryId={newQuery.id} title="My title" />
            </InspectButtonContainer>
          </TestProviderWithoutDragAndDrop>
        );

        expect(wrapper.find(`InspectButtonContainer`)).toHaveStyleRule('opacity', '0', {
          modifier: `.${BUTTON_CLASS}`,
        });
      });

      test('it renders an opaque inspect button when it has mouse focus', async () => {
        const wrapper = mount(
          <TestProviderWithoutDragAndDrop store={store}>
            <InspectButtonContainer>
              <InspectButton queryId={newQuery.id} title="My title" />
            </InspectButtonContainer>
          </TestProviderWithoutDragAndDrop>
        );

        expect(wrapper.find(`InspectButtonContainer`)).toHaveStyleRule('opacity', '1', {
          modifier: `:hover .${BUTTON_CLASS}`,
        });
      });
    });
  });

  describe('Modal Inspect - happy path', () => {
    beforeEach(() => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      store = createStore(
        myState,
        SUB_PLUGINS_REDUCER,
        apolloClientObservable,
        kibanaObservable,
        storage
      );
    });
    test('Open Inspect Modal', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop store={store}>
            <InspectButton queryId={newQuery.id} title="My title" />
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );
      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.queries[0].isInspected).toBe(true);
      expect(wrapper.find('button[data-test-subj="modal-inspect-close"]').first().exists()).toBe(
        true
      );
    });

    test('Close Inspect Modal', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop store={store}>
            <InspectButton queryId={newQuery.id} title="My title" />
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );
      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');

      wrapper.update();

      wrapper.find('button[data-test-subj="modal-inspect-close"]').first().simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.queries[0].isInspected).toBe(false);
      expect(wrapper.find('button[data-test-subj="modal-inspect-close"]').first().exists()).toBe(
        false
      );
    });

    test('Do not Open Inspect Modal if it is loading', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      store.getState().inputs.global.queries[0].loading = true;
      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.queries[0].isInspected).toBe(true);
      expect(wrapper.find('button[data-test-subj="modal-inspect-close"]').first().exists()).toBe(
        false
      );
    });
  });
});
