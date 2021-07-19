/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiToken } from '@elastic/eui';

import { SchemaType } from '../../../shared/schema/types';

import { ResultToken } from './result_token';

describe('ResultToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render a token icon based on the provided field type', () => {
    expect(
      shallow(<ResultToken fieldType={SchemaType.Text} />)
        .find(EuiToken)
        .prop('iconType')
    ).toBe('tokenString');
  });
});
