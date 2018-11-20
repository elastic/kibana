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
import { SpaceValidator } from '../lib';
import { SpaceIdentifier } from './space_identifier';

test('renders without crashing', () => {
  const props = {
    space: {
      id: '',
      name: '',
    },
    editable: true,
    onChange: jest.fn(),
    validator: new SpaceValidator(),
  };
<<<<<<< HEAD
  const wrapper = shallow(<SpaceIdentifier {...props} />);
=======
  const wrapper = shallowWithIntl(
    <SpaceIdentifier.WrappedComponent {...props} intl={null as any} />
  );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  expect(wrapper).toMatchSnapshot();
});
