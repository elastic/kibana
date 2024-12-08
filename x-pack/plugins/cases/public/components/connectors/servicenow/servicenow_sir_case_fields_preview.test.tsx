/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { connector, choices } from '../mock';
import { useGetChoices } from './use_get_choices';
import FieldsPreview from './servicenow_sir_case_fields_preview';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { createQueryWithMarkup } from '../../../common/test_utils';

jest.mock('./use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

describe('ServiceNowITSM Fields: Preview', () => {
  const fields = {
    destIp: true,
    sourceIp: true,
    malwareHash: true,
    malwareUrl: true,
    priority: '2',
    category: 'Denial of Service',
    subcategory: '12',
    additionalFields: '{"foo": "bar"}',
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    useGetChoicesMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      data: { data: choices },
    });
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    appMockRenderer.render(<FieldsPreview connector={connector} fields={fields} />);

    const getByText = createQueryWithMarkup(screen.getByText);

    expect(getByText('Destination IPs: Yes')).toBeInTheDocument();
    expect(getByText('Source IPs: Yes')).toBeInTheDocument();
    expect(getByText('Malware URLs: Yes')).toBeInTheDocument();
    expect(getByText('Malware Hashes: Yes')).toBeInTheDocument();
    expect(getByText('Priority: 2 - High')).toBeInTheDocument();
    expect(getByText('Category: Denial of Service')).toBeInTheDocument();
    expect(getByText('Subcategory: Inbound or outbound')).toBeInTheDocument();
    expect(getByText('Additional Fields: {"foo": "bar"}')).toBeInTheDocument();
  });
});
