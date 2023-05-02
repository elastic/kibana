/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { phraseFilter } from '@kbn/data-plugin/common/stubs';

import FilterContent from './filter_content';

test('alias', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: 'geo.coordinates in US',
    },
  };
  const { container } = render(<FilterContent filter={filter} valueLabel={'ios'} />);
  expect(container).toMatchSnapshot();
});

test('field custom label', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: null,
    },
  };
  const { container } = render(
    <FilterContent filter={filter} valueLabel={'ios'} fieldLabel="test label" />
  );
  expect(container).toMatchSnapshot();
});

test('alias with warning status', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: null,
      negate: true,
    },
  };
  const { container } = render(<FilterContent filter={filter} valueLabel={'Warning'} />);
  expect(container).toMatchSnapshot();
});

test('alias with error status', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: null,
      negate: true,
    },
  };
  const { container } = render(<FilterContent filter={filter} valueLabel={'Error'} />);
  expect(container).toMatchSnapshot();
});

test('warning', () => {
  const { container } = render(<FilterContent filter={phraseFilter} valueLabel={'Warning'} />);
  expect(container).toMatchSnapshot();
});

test('error', () => {
  const { container } = render(<FilterContent filter={phraseFilter} valueLabel={'Error'} />);
  expect(container).toMatchSnapshot();
});
