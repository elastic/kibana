/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { SpaceSolutionBadge } from './badge';

test('it renders without crashing with solution provided', () => {
  const component = shallowWithIntl(<SpaceSolutionBadge solution="security" />);
  expect(component).toMatchSnapshot();
});

test('it renders without crashing without solution', () => {
  const component = shallowWithIntl(<SpaceSolutionBadge />);
  expect(component).toMatchSnapshot();
});
