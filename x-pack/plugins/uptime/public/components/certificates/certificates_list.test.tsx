/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithRouter } from '../../lib';
import { CertificateList, CertSort } from './certificates_list';

describe('CertificateList', () => {
  it('shallow renders expected elements for valid props', () => {
    const page = {
      index: 0,
      size: 10,
    };
    const sort: CertSort = {
      field: 'not_after',
      direction: 'asc',
    };

    expect(
      shallowWithRouter(<CertificateList page={page} sort={sort} onChange={jest.fn()} />)
    ).toMatchSnapshot();
  });
});
