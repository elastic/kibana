/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/react_router_history.mock';

import React from 'react';
import { useParams } from 'react-router-dom';

import { shallow } from 'enzyme';

import { ReindexJob } from './';

describe('ReindexJob', () => {
  const props = {
    schemaBreadcrumb: ['Engines', 'some-engine', 'Schema'],
  };

  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValueOnce({ reindexJobId: 'abc1234567890' });
  });

  it('renders', () => {
    shallow(<ReindexJob {...props} />);
    // TODO: Check child components
  });
});
