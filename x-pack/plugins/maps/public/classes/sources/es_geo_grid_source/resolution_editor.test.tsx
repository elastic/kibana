/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

// @ts-expect-error
import { ResolutionEditor } from './resolution_editor';
import { GRID_RESOLUTION } from '../../../../common/constants';

const defaultProps = {
  resolution: GRID_RESOLUTION.COARSE,
  onChange: () => {},
  includeSuperFine: false,
};

describe('resolution editor', () => {
  test('should omit super-fine option', async () => {
    const component = shallow(<ResolutionEditor />);
    expect(component).toMatchSnapshot();
  });
  test('should add super-fine option', async () => {
    const component = shallow(<ResolutionEditor includeSuperFine={true} />);
    expect(component).toMatchSnapshot();
  });
});
