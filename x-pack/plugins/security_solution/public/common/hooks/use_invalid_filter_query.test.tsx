/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';

import { createMockStore, kibanaMock, mockGlobalState, TestProviders } from '../mock';
import type { Query } from '@kbn/es-query';
import { genHash, useInvalidFilterQuery } from './use_invalid_filter_query';

const getStore = () =>
  createMockStore(
    {
      ...mockGlobalState,
      app: {
        ...mockGlobalState.app,
        errors: [],
      },
    },
    undefined,
    kibanaMock
  );

const getProps = () => ({
  id: 'test-id',
  kqlError: new Error('boom'),
  query: { query: ': :', language: 'kuery' },
  startDate: '2017-01-01T00:00:00.000Z',
  endDate: '2018-01-02T00:00:00.000Z',
});

describe('useInvalidFilterQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes error toast with error title and error instance without original stack', () => {
    const store = getStore();
    const props = getProps();
    const InvalidFilterComponent = () => {
      useInvalidFilterQuery(props);
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );

    expect(store.getState().app.errors).toEqual([
      {
        displayError: true,
        id: props.id,
        hash: genHash(props.kqlError.message),
        message: [props.kqlError.message],
        title: props.kqlError.name,
      },
    ]);

    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledWith(props.kqlError, {
      title: props.kqlError.name,
    });
    expect(props.kqlError.stack).toBeUndefined();
  });

  it('does not invoke error toast, when kqlError is missing', () => {
    const store = getStore();
    const props = getProps();
    const InvalidFilterComponent = () => {
      useInvalidFilterQuery({
        id: props.id,
        query: props.query,
        startDate: props.startDate,
        endDate: props.endDate,
      });
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('does not invoke error toast, when kqlError misses name property', () => {
    const store = getStore();
    const props = getProps();
    // @ts-expect-error
    props.kqlError.name = null;
    const InvalidFilterComponent = () => {
      useInvalidFilterQuery(props);
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('does not invoke error toast, when kqlError misses message property', () => {
    const store = getStore();
    const props = getProps();
    // @ts-expect-error
    props.kqlError.message = null;
    const InvalidFilterComponent = () => {
      useInvalidFilterQuery(props);
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('does not invoke error toast, when filterQuery is present', () => {
    const store = getStore();
    const props = getProps();
    const InvalidFilterComponent = () => {
      useInvalidFilterQuery({
        ...props,
        filterQuery: 'filterQuery',
      });
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  // POTENTIAL BUG: the idea of having an id is usually to prevent multiple toasts from being shown
  // when you have different errors with the same id, but this test shows that it will show multiple toasts
  // so we need to double check if this is the intended behavior
  it('invokes toast for each error, when called multiple times with same id and different errors', () => {
    const store = getStore();
    const props = getProps();

    const kqlError2 = new Error('boom2');
    const InvalidFilterComponent = () => {
      useInvalidFilterQuery(props);
      useInvalidFilterQuery({
        ...props,
        kqlError: kqlError2,
      });
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(2);
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledWith(props.kqlError, {
      title: props.kqlError.name,
    });
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledWith(kqlError2, {
      title: kqlError2.name,
    });
  });

  // BUG: when invoked multiple times with same id and and error it should invoke the toast exactly once
  //
  // this test simply documents the current behavior
  // so it's visible and people dont need to guess how this exactly works
  // before this is fixed via ticket
  it('does not invoke any toast, when called multiple times with same id and same error', () => {
    const store = getStore();
    const props = getProps();
    const InvalidFilterComponent = () => {
      useInvalidFilterQuery(props);
      useInvalidFilterQuery(props);
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('invokes error toast with only the first error, when called multiple times with different id and same error', () => {
    const store = getStore();
    const props = getProps();

    const InvalidFilterComponent = () => {
      useInvalidFilterQuery(props);
      useInvalidFilterQuery({
        ...props,
        id: 'test-id2',
      });
      return null;
    };
    render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledWith(props.kqlError, {
      title: props.kqlError.name,
    });
  });

  it('does not invoke error toast, when query prop is changed', () => {
    const store = getStore();
    const props = getProps();
    const InvalidFilterComponent: React.FC<{ query: Query }> = ({ query }) => {
      useInvalidFilterQuery(props);
      return null;
    };
    const { rerender } = render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent query={{ query: ': ::', language: 'kuery' }} />
      </TestProviders>
    );
    rerender(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent query={{ query: ': :::', language: 'kuery' }} />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });

  it('does not invoke error toast, when startDate prop is changed', () => {
    const store = getStore();
    const props = getProps();
    const InvalidFilterComponent: React.FC<{ startDate: string }> = ({ startDate }) => {
      useInvalidFilterQuery(props);
      return null;
    };
    const { rerender } = render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent startDate="2017-01-01T00:00:00.000Z" />
      </TestProviders>
    );
    rerender(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent startDate="2015-01-01T00:00:00.000Z" />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });

  it('does not invoke error toast, when endDate prop is changed', () => {
    const store = getStore();
    const props = getProps();
    const InvalidFilterComponent: React.FC<{ endDate: string }> = ({ endDate }) => {
      useInvalidFilterQuery(props);
      return null;
    };
    const { rerender } = render(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent endDate="2018-01-02T00:00:00.000Z" />
      </TestProviders>
    );
    rerender(
      <TestProviders store={store} startServices={kibanaMock}>
        <InvalidFilterComponent endDate="2019-01-02T00:00:00.000Z" />
      </TestProviders>
    );
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });
});
