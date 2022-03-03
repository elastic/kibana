/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithIntl } from '@kbn/test-jest-helpers';
import { PageLoading } from '.';

describe('PageLoading', () => {
  test('should show a simple page loading component', () => {
    expect(renderWithIntl(<PageLoading />)).toMatchSnapshot();
  });
});
