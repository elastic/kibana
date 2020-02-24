/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { FormCreateDrilldown } from '.';

describe('<FormCreateDrilldown>', () => {
  test('renders without crashing', () => {
    const div = document.createElement('div');
    render(<FormCreateDrilldown name={''} onNameChange={() => {}} />, div);
  });
});
