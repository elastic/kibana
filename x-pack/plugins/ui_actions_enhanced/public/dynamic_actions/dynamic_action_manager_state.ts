/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializedEvent } from './types';

/**
 * This interface represents the state of @type {DynamicActionManager} at any
 * point in time.
 */
export interface State {
  /**
   * Whether dynamic action manager is currently in process of fetching events
   * from storage.
   */
  readonly isFetchingEvents: boolean;

  /**
   * Number of times event fetching has been completed.
   */
  readonly fetchCount: number;

  /**
   * Error received last time when fetching events.
   */
  readonly fetchError?: {
    message: string;
  };

  /**
   * List of all fetched events.
   */
  readonly events: readonly SerializedEvent[];
}

export interface Transitions {
  startFetching: (state: State) => () => State;
  finishFetching: (state: State) => (events: SerializedEvent[]) => State;
  failFetching: (state: State) => (error: { message: string }) => State;
  addEvent: (state: State) => (event: SerializedEvent) => State;
  removeEvent: (state: State) => (eventId: string) => State;
  replaceEvent: (state: State) => (event: SerializedEvent) => State;
}

export interface Selectors {
  getEvent: (state: State) => (eventId: string) => SerializedEvent | null;
}

export const defaultState: State = {
  isFetchingEvents: false,
  fetchCount: 0,
  events: [],
};

export const transitions: Transitions = {
  startFetching: (state) => () => ({ ...state, isFetchingEvents: true }),

  finishFetching: (state) => (events) => ({
    ...state,
    isFetchingEvents: false,
    fetchCount: state.fetchCount + 1,
    fetchError: undefined,
    events,
  }),

  failFetching: (state) => ({ message }) => ({
    ...state,
    isFetchingEvents: false,
    fetchCount: state.fetchCount + 1,
    fetchError: { message },
  }),

  addEvent: (state) => (event: SerializedEvent) => ({
    ...state,
    events: [...state.events, event],
  }),

  removeEvent: (state) => (eventId: string) => ({
    ...state,
    events: state.events ? state.events.filter((event) => event.eventId !== eventId) : state.events,
  }),

  replaceEvent: (state) => (event) => {
    const index = state.events.findIndex(({ eventId }) => eventId === event.eventId);
    if (index === -1) return state;

    return {
      ...state,
      events: [...state.events.slice(0, index), event, ...state.events.slice(index + 1)],
    };
  },
};

export const selectors: Selectors = {
  getEvent: (state) => (eventId) => state.events.find((event) => event.eventId === eventId) || null,
};
