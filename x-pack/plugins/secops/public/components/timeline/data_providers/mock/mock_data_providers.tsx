/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiText } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';
import { DataProvider } from '../data_provider';

interface NameToEventCount<TValue> {
  [name: string]: TValue;
}

/**
 * A map of mock data provider name to a count of events for
 * that mock data provider
 */
const mockSourceNameToEventCount: NameToEventCount<number> = {
  'Provider 1': 64,
  'Provider 2': 158,
  'Provider 3': 381,
  'Provider 4': 237,
  'Provider 5': 310,
  'Provider 6': 1052,
  'Provider 7': 533,
  'Provider 8': 429,
  'Provider 9': 706,
};

/** Returns a collection of mock data provider names */
export const mockDataProviderNames = (): string[] => Object.keys(mockSourceNameToEventCount);

/** Returns a count of the events for a mock data provider */
export const getEventCount = (dataProviderName: string): number =>
  mockSourceNameToEventCount[dataProviderName] || 0;

const Text = styled(EuiText)`
  display: inline;
  padding-left: 5px;
`;

/**
 * A collection of mock data providers, that can both be rendered
 * in the browser, and also used as mocks in unit and functional tests.
 */
export const mockDataProviders: DataProvider[] = Object.keys(mockSourceNameToEventCount).map(
  name => ({
    enabled: true,
    id: `id-${name}`,
    name,
    negated: false,
    render: () => (
      <div data-test-subj="mockDataProvider">
        <EuiBadge color="primary">{getEventCount(name)}</EuiBadge>
        <Text> {name} </Text>
      </div>
    ),
  })
);
