/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { render, screen } from '@testing-library/react';

import type { CaseCustomFieldDate } from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { View } from './view';

describe('View ', () => {
  moment.locale('en');

  beforeEach(() => {
    moment.tz.setDefault('UTC');
    jest.clearAllMocks();
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  const customField = {
    type: CustomFieldTypes.DATE as const,
    key: 'test_key_1',
    value: '2024-02-28T00:00:00.000Z',
  } as CaseCustomFieldDate;

  it('renders correctly', async () => {
    render(<View customField={customField} />);

    expect(screen.getByText('28/02/2024, 00:00:00')).toBeInTheDocument();
  });
});
