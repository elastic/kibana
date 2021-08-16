/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialEventFiltersPageState } from './builders';
import { eventFiltersPageReducer } from './reducer';
import { getInitialExceptionFromEvent } from './utils';
import { createdEventFilterEntryMock, ecsEventMock } from '../test_utils';
import { UserChangedUrl } from '../../../../common/store/routing/action';
import { getListPageIsActive } from './selector';
import { EventFiltersListPageState } from '../types';

describe('event filters reducer', () => {
  let initialState: EventFiltersListPageState;

  beforeEach(() => {
    initialState = initialEventFiltersPageState();
  });

  describe('EventFiltersForm', () => {
    it('sets the initial form values', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersInitForm',
        payload: { entry },
      });

      expect(result).toStrictEqual({
        ...initialState,
        form: {
          ...initialState.form,
          entry,
          hasNameError: !entry.name,
          submissionResourceState: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });

    it('change form values', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const nameChanged = 'name changed';
      const newComment = 'new comment';
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersChangeForm',
        payload: { entry: { ...entry, name: nameChanged }, newComment },
      });

      expect(result).toStrictEqual({
        ...initialState,
        form: {
          ...initialState.form,
          entry: {
            ...entry,
            name: nameChanged,
          },
          newComment,
          hasNameError: false,
          submissionResourceState: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });

    it('change form values without entry', () => {
      const newComment = 'new comment';
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersChangeForm',
        payload: { newComment },
      });

      expect(result).toStrictEqual({
        ...initialState,
        form: {
          ...initialState.form,
          newComment,
          submissionResourceState: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });

    it('change form status', () => {
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: createdEventFilterEntryMock(),
        },
      });

      expect(result).toStrictEqual({
        ...initialState,
        form: {
          ...initialState.form,
          submissionResourceState: {
            type: 'LoadedResourceState',
            data: createdEventFilterEntryMock(),
          },
        },
      });
    });

    it('clean form after change form status', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const nameChanged = 'name changed';
      const newComment = 'new comment';
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersChangeForm',
        payload: { entry: { ...entry, name: nameChanged }, newComment },
      });
      const cleanState = eventFiltersPageReducer(result, {
        type: 'eventFiltersInitForm',
        payload: { entry },
      });

      expect(cleanState).toStrictEqual({
        ...initialState,
        form: { ...initialState.form, entry, hasNameError: true, newComment: '' },
      });
    });

    it('create is success and force list refresh', () => {
      const initialStateWithListPageActive = {
        ...initialState,
        listPage: { ...initialState.listPage, active: true },
      };
      const result = eventFiltersPageReducer(initialStateWithListPageActive, {
        type: 'eventFiltersCreateSuccess',
      });

      expect(result).toStrictEqual({
        ...initialStateWithListPageActive,
        listPage: {
          ...initialStateWithListPageActive.listPage,
          forceRefresh: true,
        },
      });
    });
  });
  describe('UserChangedUrl', () => {
    const userChangedUrlAction = (
      search: string = '',
      pathname = '/administration/event_filters'
    ): UserChangedUrl => ({
      type: 'userChangedUrl',
      payload: { search, pathname, hash: '' },
    });

    describe('When url is the Event List page', () => {
      it('should mark page active when on the list url', () => {
        const result = eventFiltersPageReducer(initialState, userChangedUrlAction());
        expect(getListPageIsActive(result)).toBe(true);
      });

      it('should mark page not active when not on the list url', () => {
        const result = eventFiltersPageReducer(
          initialState,
          userChangedUrlAction('', '/some-other-page')
        );
        expect(getListPageIsActive(result)).toBe(false);
      });
    });

    describe('When `show=create`', () => {
      it('receives a url change with show=create', () => {
        const result = eventFiltersPageReducer(initialState, userChangedUrlAction('?show=create'));

        expect(result).toStrictEqual({
          ...initialState,
          location: {
            ...initialState.location,
            id: undefined,
            show: 'create',
          },
          listPage: {
            ...initialState.listPage,
            active: true,
          },
        });
      });
    });
  });

  describe('ForceRefresh', () => {
    it('sets the force refresh state to true', () => {
      const result = eventFiltersPageReducer(
        {
          ...initialState,
          listPage: { ...initialState.listPage, forceRefresh: false },
        },
        { type: 'eventFiltersForceRefresh', payload: { forceRefresh: true } }
      );

      expect(result).toStrictEqual({
        ...initialState,
        listPage: { ...initialState.listPage, forceRefresh: true },
      });
    });
    it('sets the force refresh state to false', () => {
      const result = eventFiltersPageReducer(
        {
          ...initialState,
          listPage: { ...initialState.listPage, forceRefresh: true },
        },
        { type: 'eventFiltersForceRefresh', payload: { forceRefresh: false } }
      );

      expect(result).toStrictEqual({
        ...initialState,
        listPage: { ...initialState.listPage, forceRefresh: false },
      });
    });
  });
});
