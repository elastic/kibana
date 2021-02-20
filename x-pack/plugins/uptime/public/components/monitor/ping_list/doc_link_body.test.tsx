/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';
import { DocLinkForBody } from './doc_link_body';

describe('PingListExpandedRow', () => {
  it('renders expected elements for valid props', () => {
    expect(shallowWithIntl(<DocLinkForBody />)).toMatchSnapshot();
  });
});
