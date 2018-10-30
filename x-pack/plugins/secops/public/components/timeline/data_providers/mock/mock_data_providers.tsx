/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { DataProvider } from '../data_provider';
import { FacetText } from '../facet_text';

/**
 * A map of mock data provider name to a count of events for
 * that mock data provider
 */
const mockSourceNameToEventCount = {
  'Provider 1': 64,
  'Provider 2': 158,
  'Provider 3': 381,
  'Provider 4': 237,
  'Provider 5': 310,
  'Provider 6': 1052,
  'Provider 7': 538,
  'Provider 8': 429,
  'Provider 9': 708,
};

/** Returns a collection of mock data provider names */
export const mockDataProviderNames = (): string[] => Object.keys(mockSourceNameToEventCount);

/** Returns a count of the events for a mock data provider */
export const getEventCount = (dataProviderName: string): number =>
  mockSourceNameToEventCount[dataProviderName] || 0;

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
        {name} <FacetText text={`${getEventCount(name)}`} />
      </div>
    ),
  })
);
