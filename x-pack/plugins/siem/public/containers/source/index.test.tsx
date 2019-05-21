/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { IndexType } from '../../graphql/types';
import { wait } from '../../lib/helpers';

import { WithSource } from '.';
import { mockBrowserFields, mockIndexFields, mocksSource } from './mock';

describe('Index Fields & Browser Fields', () => {
  test('Index Fields', async () => {
    mount(
      <MockedProvider mocks={mocksSource} addTypename={false}>
        <WithSource sourceId="default" indexTypes={[IndexType.ANY]}>
          {({ indexPattern }) => {
            if (!isEqual(indexPattern.fields, [])) {
              expect(indexPattern.fields).toEqual(mockIndexFields);
            }

            return null;
          }}
        </WithSource>
      </MockedProvider>
    );

    // Why => https://github.com/apollographql/react-apollo/issues/1711
    await wait();
  });

  test('Browser Fields', async () => {
    mount(
      <MockedProvider mocks={mocksSource} addTypename={false}>
        <WithSource sourceId="default" indexTypes={[IndexType.ANY]}>
          {({ browserFields }) => {
            if (!isEqual(browserFields, {})) {
              expect(browserFields).toEqual(mockBrowserFields);
            }

            return null;
          }}
        </WithSource>
      </MockedProvider>
    );

    // Why => https://github.com/apollographql/react-apollo/issues/1711
    await wait();
  });
});
