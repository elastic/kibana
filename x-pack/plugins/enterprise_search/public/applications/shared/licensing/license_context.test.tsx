/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { mountWithContext } from '../../__mocks__';
import { LicenseContext, ILicenseContext } from './';

describe('LicenseProvider', () => {
  const MockComponent: React.FC = () => {
    const { license } = useContext(LicenseContext) as ILicenseContext;
    return <div className="license-test">{license?.type}</div>;
  };

  it('renders children', () => {
    const wrapper = mountWithContext(<MockComponent />, { license: { type: 'basic' } });

    expect(wrapper.find('.license-test')).toHaveLength(1);
    expect(wrapper.text()).toEqual('basic');
  });
});
