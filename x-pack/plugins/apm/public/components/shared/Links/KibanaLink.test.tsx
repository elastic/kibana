/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { UnconnectedKibanaLink } from './KibanaLink';

describe('UnconnectedKibanaLink', () => {
  it('should render correct markup', () => {
    const wrapper = shallow(
      <UnconnectedKibanaLink
        location={{ search: '' } as Location}
        pathname={'/app/kibana'}
        hash={'/discover'}
      >
        Go to Discover
      </UnconnectedKibanaLink>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
