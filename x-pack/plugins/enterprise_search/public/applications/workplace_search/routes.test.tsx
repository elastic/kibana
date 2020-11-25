/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiLink } from '@elastic/eui';

import {
  getContentSourcePath,
  SOURCES_PATH,
  PERSONAL_SOURCES_PATH,
  SOURCE_DETAILS_PATH,
} from './routes';

const TestComponent = ({ id, isOrg }: { id: string; isOrg?: boolean }) => {
  const href = getContentSourcePath(SOURCE_DETAILS_PATH, id, !!isOrg);
  return <EuiLink href={href}>test</EuiLink>;
};

describe('getContentSourcePath', () => {
  it('should format org route', () => {
    const wrapper = shallow(<TestComponent id="123" isOrg />);
    const path = wrapper.find(EuiLink).prop('href');

    expect(path).toEqual(`${SOURCES_PATH}/123`);
  });

  it('should format user route', () => {
    const wrapper = shallow(<TestComponent id="123" />);
    const path = wrapper.find(EuiLink).prop('href');

    expect(path).toEqual(`${PERSONAL_SOURCES_PATH}/123`);
  });
});
