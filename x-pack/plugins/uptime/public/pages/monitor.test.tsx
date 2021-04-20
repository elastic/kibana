/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MonitorPage } from './monitor';
import { shallowWithRouter } from '../lib';

describe('MonitorPage', () => {
  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<MonitorPage />)).toMatchSnapshot();
  });
});
