/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
import { mount } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { PrivilegeCalloutWarning } from './privilege_callout_warning';

describe('PrivilegeCalloutWarning', () => {
  it('renders without crashing', () => {
    expect(
<<<<<<< HEAD
      mount(<PrivilegeCalloutWarning basePrivilege={'all'} isReservedRole={false} />)
=======
      mountWithIntl(<PrivilegeCalloutWarning basePrivilege={'all'} isReservedRole={false} />)
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    ).toMatchSnapshot();
  });
});
