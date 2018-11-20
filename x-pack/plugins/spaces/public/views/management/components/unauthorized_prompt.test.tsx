/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
<<<<<<< HEAD
import { shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { UnauthorizedPrompt } from './unauthorized_prompt';

describe('UnauthorizedPrompt', () => {
  it('renders as expected', () => {
<<<<<<< HEAD
    expect(shallow(<UnauthorizedPrompt />)).toMatchSnapshot();
=======
    expect(shallowWithIntl(<UnauthorizedPrompt />)).toMatchSnapshot();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  });
});
