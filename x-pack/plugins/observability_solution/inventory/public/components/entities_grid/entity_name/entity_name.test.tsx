/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityName } from '.';
import { useDetailViewRedirect } from '../../../hooks/use_detail_view_redirect';
import { InventoryEntityLatest } from '../../../../common/entities';

jest.mock('../../../hooks/use_detail_view_redirect');

const useDetailViewRedirectMock = useDetailViewRedirect as jest.Mock;

describe('EntityName', () => {
  const mockEntity: InventoryEntityLatest = {
    entity: {
      last_seen_timestamp: '2023-10-09T00:00:00Z',
      id: '1',
      type: 'service',
      display_name: 'entity_name',
      identity_fields: ['service.name', 'service.environment'],
      definition_id: 'entity_definition_id',
      definition_version: '1.0.0',
      schema_version: '1.0.0',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the entity name correctly', () => {
    useDetailViewRedirectMock.mockReturnValue({
      getEntityRedirectUrl: jest.fn().mockReturnValue(null),
    });

    render(<EntityName entity={mockEntity} />);

    expect(screen.getByText('entity_name')).toBeInTheDocument();
  });

  it('should a link when getEntityRedirectUrl returns a URL', () => {
    useDetailViewRedirectMock.mockReturnValue({
      getEntityRedirectUrl: jest.fn().mockReturnValue('http://foo.bar'),
    });

    render(<EntityName entity={mockEntity} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', 'http://foo.bar');
  });

  it('should not render a link when getEntityRedirectUrl returns null', () => {
    useDetailViewRedirectMock.mockReturnValue({
      getEntityRedirectUrl: jest.fn().mockReturnValue(null),
    });

    render(<EntityName entity={mockEntity} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
