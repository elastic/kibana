/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ManageMLJobComponent } from '../manage_ml_job';
import * as redux from 'react-redux';
import { renderWithRouter, shallowWithRouter } from '../../../../lib';

describe('Manage ML Job', () => {
  it('shallow renders without errors', () => {
    const spy = jest.spyOn(redux, 'useSelector');
    spy.mockReturnValue(true);

    const wrapper = shallowWithRouter(
      <ManageMLJobComponent hasMLJob={true} onEnableJob={jest.fn()} onJobDelete={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without errors', () => {
    const spy = jest.spyOn(redux, 'useSelector');
    spy.mockReturnValue(true);

    const wrapper = renderWithRouter(
      <ManageMLJobComponent hasMLJob={true} onEnableJob={jest.fn()} onJobDelete={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
