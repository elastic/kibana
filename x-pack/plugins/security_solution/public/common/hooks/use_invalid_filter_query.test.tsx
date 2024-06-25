/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Some tests are prefixed with `// BUG:` or `// POTENTIAL BUG:`
// to indicate that the particular test is not working as expected
// but is simply documenting the current behavior.

import React from 'react';
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import type { Store } from 'redux';

import { createMockStore, kibanaMock, mockGlobalState, TestProviders } from '../mock';
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

const getWrapper = (store: Store): React.FC => {
  // eslint-disable-next-line react/display-name
  return ({ children }) => (
    <TestProviders store={store} startServices={kibanaMock}>
      {children}
    </TestProviders>
  );
};

describe('useInvalidFilterQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes error toast with error title and error instance without original stack', () => {
    const store = getStore();
    const props = getProps();

    renderHook(useInvalidFilterQuery, { initialProps: props, wrapper: getWrapper(store) });

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

    renderHook(useInvalidFilterQuery, {
      initialProps: {
        id: props.id,
        query: props.query,
        startDate: props.startDate,
        endDate: props.endDate,
      },
      wrapper: getWrapper(store),
    });

    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('does not invoke error toast, when kqlError misses name property', () => {
    const store = getStore();
    const props = getProps();

    // @ts-expect-error
    props.kqlError.name = null;
    renderHook(useInvalidFilterQuery, { initialProps: props, wrapper: getWrapper(store) });

    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('does not invoke error toast, when kqlError misses message property', () => {
    const store = getStore();
    const props = getProps();

    // @ts-expect-error
    props.kqlError.message = null;
    renderHook(useInvalidFilterQuery, { initialProps: props, wrapper: getWrapper(store) });

    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('does not invoke error toast, when filterQuery is present', () => {
    const store = getStore();
    const props = getProps();

    renderHook(useInvalidFilterQuery, {
      initialProps: { ...props, filterQuery: 'filterQuery' },
      wrapper: getWrapper(store),
    });

    expect(kibanaMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  // POTENTIAL BUG:
  //
  // id should ensure that only one toast is shown
  // when you have different errors with the same id,
  // but this test shows that it will currently show multiple toasts
  // so we need to double check if this is the intended behavior and fix otherwise
  it('invokes toast for each error, when called multiple times with same id and different errors, during a single render', async () => {
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

  // BUG:
  //
  // additional +1 toast invocation when called multiple times with same id and different errors
  // should not happen, error invocation count should equal the number of unique errors

  it('invokes toast for each error +1, when called multiple times with same id and different errors, during multiple rerenders', async () => {
    const store = getStore();
    const props = getProps();

    const kqlError2 = new Error('boom2');
    const { rerender } = renderHook(useInvalidFilterQuery, {
      initialProps: props,
      wrapper: getWrapper(store),
    });
    rerender({ ...props, kqlError: kqlError2 });

    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(3);
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledWith(props.kqlError, {
      title: props.kqlError.name,
    });
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledWith(kqlError2, {
      title: kqlError2.name,
    });
  });

  // BUG:
  //
  // when invoked multiple times with same id and and error it should invoke the toast exactly once
  it('does not invoke any toast, when called multiple times with same id and same error, during a single render', () => {
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

  it('invokes toast once, when called multiple times with same id and same error, during multiple rerenders', () => {
    const store = getStore();
    const props = getProps();

    const { rerender } = renderHook(useInvalidFilterQuery, {
      initialProps: props,
      wrapper: getWrapper(store),
    });
    rerender();
    rerender();

    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });

  it('invokes error toast with only the first error, when called multiple times with different id and same error', () => {
    const store = getStore();
    const props = getProps();

    const { rerender } = renderHook(useInvalidFilterQuery, {
      initialProps: props,
      wrapper: getWrapper(store),
    });
    rerender({
      ...props,
      id: 'test-id2',
    });

    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledWith(props.kqlError, {
      title: props.kqlError.name,
    });
  });

  it('does not invoke error toast, when query prop is changed', () => {
    const store = getStore();
    const props = getProps();

    const { rerender } = renderHook(useInvalidFilterQuery, {
      initialProps: props,
      wrapper: getWrapper(store),
    });
    rerender({
      ...props,
      query: { query: ': :::', language: 'kuery' },
    });

    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });

  it('does not invoke error toast, when startDate prop is changed', () => {
    const store = getStore();
    const props = getProps();

    const { rerender } = renderHook(useInvalidFilterQuery, {
      initialProps: props,
      wrapper: getWrapper(store),
    });
    rerender({
      ...props,
      startDate: '2015-01-01T00:00:00.000Z',
    });

    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });

  it('does not invoke error toast, when endDate prop is changed', () => {
    const store = getStore();
    const props = getProps();

    const { rerender } = renderHook(useInvalidFilterQuery, {
      initialProps: props,
      wrapper: getWrapper(store),
    });
    rerender({
      ...props,
      endDate: '2019-01-02T00:00:00.000Z',
    });

    expect(kibanaMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });
});
