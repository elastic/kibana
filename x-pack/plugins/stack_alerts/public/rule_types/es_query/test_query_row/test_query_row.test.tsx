/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { TestQueryRow } from './test_query_row';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    __esModule: true,
    ...original,
    copyToClipboard: jest.fn(() => true),
  };
});

const COPIED_QUERY = 'COPIED QUERY';
const onFetch = () =>
  Promise.resolve({
    testResults: {
      results: [{ group: 'all documents', hits: [], count: 42 }],
      truncated: false,
    },
    isGrouped: false,
    timeWindow: '5m',
  });
const onCopyQuery = () => COPIED_QUERY;

describe('TestQueryRow', () => {
  it('should render the copy query button if copyQuery is provided', () => {
    const component = mountWithIntl(
      <TestQueryRow fetch={onFetch} copyQuery={onCopyQuery} hasValidationErrors={false} />
    );
    expect(findTestSubject(component, 'copyQuery').exists()).toBe(true);
  });

  it('should not render the copy query button if copyQuery is not provided', () => {
    const component = mountWithIntl(<TestQueryRow fetch={onFetch} hasValidationErrors={false} />);
    expect(findTestSubject(component, 'copyQuery').exists()).toBe(false);
  });

  it('should disable the test query and copy query buttons if hasValidationErrors is true', () => {
    const component = mountWithIntl(
      <TestQueryRow fetch={onFetch} copyQuery={onCopyQuery} hasValidationErrors={true} />
    );
    expect(findTestSubject(component, 'testQuery').prop('disabled')).toBe(true);
    expect(findTestSubject(component, 'copyQuery').prop('disabled')).toBe(true);
  });

  it('should not disable the test query and copy query buttons if hasValidationErrors is false', () => {
    const component = mountWithIntl(
      <TestQueryRow fetch={onFetch} copyQuery={onCopyQuery} hasValidationErrors={false} />
    );
    expect(findTestSubject(component, 'testQuery').prop('disabled')).toBe(false);
    expect(findTestSubject(component, 'copyQuery').prop('disabled')).toBe(false);
  });

  it('should call the fetch callback when the test query button is clicked', async () => {
    const localOnFetch = jest.fn(onFetch);
    const component = mountWithIntl(
      <TestQueryRow fetch={localOnFetch} hasValidationErrors={false} />
    );
    await act(async () => {
      findTestSubject(component, 'testQuery').simulate('click');
    });
    expect(localOnFetch).toHaveBeenCalled();
  });

  it('should call the copyQuery callback and pass the returned value to copyToClipboard when the copy query button is clicked', async () => {
    const localOnCopyQuery = jest.fn(onCopyQuery);
    const component = mountWithIntl(
      <TestQueryRow fetch={onFetch} copyQuery={localOnCopyQuery} hasValidationErrors={false} />
    );
    await act(async () => {
      findTestSubject(component, 'copyQuery').simulate('click');
    });
    component.update();
    expect(localOnCopyQuery).toHaveBeenCalled();
    expect(copyToClipboard).toHaveBeenCalledWith(COPIED_QUERY);
  });
});
