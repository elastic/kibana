/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { StaticIndexPatternField } from 'ui/index_patterns';

import { IndexType } from '../../graphql/types';

import { BrowserFields, WithSource } from '.';
import { mockBrowserFields, mockIndexFields, mocksSource } from './mock';

describe('Index Fields & Browser Fields', () => {
  test('Index Fields', async () => {
    let indexFields: StaticIndexPatternField[] = [];
    const wrapper = mount(
      <MockedProvider mocks={mocksSource} addTypename={false}>
        <WithSource sourceId="default" indexTypes={[IndexType.ANY]}>
          {({ indexPattern }) => {
            indexFields = indexPattern.fields;
            return null;
          }}
        </WithSource>
      </MockedProvider>
    );
    // Why => https://github.com/apollographql/react-apollo/issues/1711
    await new Promise(resolve => setTimeout(resolve));
    wrapper.update();
    expect(indexFields).toEqual(mockIndexFields);
  });

  test('Browser Fields', async () => {
    let browserFieldsResult: BrowserFields;
    const wrapper = mount(
      <MockedProvider mocks={mocksSource} addTypename={false}>
        <WithSource sourceId="default" indexTypes={[IndexType.ANY]}>
          {({ browserFields }) => {
            browserFieldsResult = browserFields;
            return null;
          }}
        </WithSource>
      </MockedProvider>
    );
    // Why => https://github.com/apollographql/react-apollo/issues/1711
    await new Promise(resolve => setTimeout(resolve));
    wrapper.update();
    expect(browserFieldsResult!).toEqual(mockBrowserFields);
  });
});
