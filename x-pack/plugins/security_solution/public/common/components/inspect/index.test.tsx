/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import {
  TestProviders,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../mock';
import { createStore, State } from '../../store';
import { UpdateQueryParams, upsertQuery } from '../../store/inputs/helpers';

import { InspectButton } from '.';
import { cloneDeep } from 'lodash/fp';

jest.mock('./modal', () => ({
  ModalInspectQuery: jest.fn(() => <div data-test-subj="mocker-modal" />),
}));

describe('Inspect Button', () => {
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

  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  describe('Render', () => {
    beforeEach(() => {
      const myState = cloneDeep(state);
      myState.inputs = upsertQuery(newQuery);
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });
    test('Eui Empty Button', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} inputId="timeline" title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('button[data-test-subj="inspect-empty-button"]').first().exists()).toBe(
        true
      );
    });

    test('it does NOT render the Eui Empty Button when timeline is timeline and compact is true', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton compact={true} queryId={newQuery.id} inputId="timeline" title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('button[data-test-subj="inspect-empty-button"]').first().exists()).toBe(
        false
      );
    });

    test('Eui Icon Button', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('button[data-test-subj="inspect-icon-button"]').first().exists()).toBe(
        true
      );
    });

    test('renders the Icon Button when inputId does NOT equal global, but compact is true', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton compact={true} inputId="timeline" queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('button[data-test-subj="inspect-icon-button"]').first().exists()).toBe(
        true
      );
    });

    test('Eui Empty Button disabled', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    test('Eui Icon Button disabled', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    test('Button disabled when inspect == null', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = null;
      myState.inputs = upsertQuery(myQuery);
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    test('Button disabled when inspect.dsl.length == 0', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: [],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    test('Button disabled when inspect.response.length == 0', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: [],
      };
      myState.inputs = upsertQuery(myQuery);
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
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
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    });
    test('Open Inspect Modal', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.queries[0].isInspected).toBe(true);
      expect(wrapper.find('[data-test-subj="mocker-modal"]').first().exists()).toBe(true);
    });

    test('Do not Open Inspect Modal if it is loading', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(store.getState().inputs.global.queries[0].isInspected).toBe(false);
      store.getState().inputs.global.queries[0].loading = true;
      wrapper.find('button[data-test-subj="inspect-icon-button"]').first().simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.queries[0].isInspected).toBe(true);
      expect(wrapper.find('button[data-test-subj="modal-inspect-close"]').first().exists()).toBe(
        false
      );
    });
  });

  describe('Modal Inspect - show or hide', () => {
    test('shows when request/response are complete and isInspected=true', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['a length'],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = true;
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="mocker-modal"]').first().exists()).toEqual(true);
    });

    test('hides when request/response are complete and isInspected=false', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['a length'],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = false;
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="mocker-modal"]').first().exists()).toEqual(false);
    });

    test('hides when request is empty and isInspected=true', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: [],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = true;
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="mocker-modal"]').first().exists()).toEqual(false);
    });

    test('hides when response is empty and isInspected=true', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: [],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = true;
      store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = mount(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="mocker-modal"]').first().exists()).toEqual(false);
    });
  });
});
