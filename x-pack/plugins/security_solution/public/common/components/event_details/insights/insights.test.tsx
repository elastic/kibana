/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock';

import { useKibana as mockUseKibana } from '../../../lib/kibana/__mocks__';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { noCasesPermissions, readCasesPermissions } from '../../../../cases_test_utils';
import { Insights } from './insights';
import * as i18n from './translations';

const mockedUseKibana = mockUseKibana();
jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');

  return {
    ...original,
    useGetUserCasesPermissions: jest.fn(),
    useToasts: jest.fn().mockReturnValue({ addWarning: jest.fn() }),
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          api: {
            getRelatedCases: jest.fn(),
          },
        },
      },
    }),
  };
});
const mockUseGetUserCasesPermissions = useGetUserCasesPermissions as jest.Mock;

describe('Insights', () => {
  beforeEach(() => {
    mockUseGetUserCasesPermissions.mockReturnValue(noCasesPermissions());
  });

  it('does not render when there is no content to show', () => {
    render(
      <TestProviders>
        <Insights browserFields={{}} eventId="test" data={[]} timelineId="" />
      </TestProviders>
    );

    expect(
      screen.queryByRole('heading', {
        name: i18n.INSIGHTS,
      })
    ).not.toBeInTheDocument();
  });

  it('renders when there is at least one insight element to show', () => {
    // One of the insights modules is the module showing related cases.
    // It will show for all users that are able to read case data.
    // Enabling that permission, will show the case insight module which
    // is necessary to pass this test.
    mockUseGetUserCasesPermissions.mockReturnValue(readCasesPermissions());

    render(
      <TestProviders>
        <Insights browserFields={{}} eventId="test" data={[]} timelineId="" />
      </TestProviders>
    );

    expect(
      screen.queryByRole('heading', {
        name: i18n.INSIGHTS,
      })
    ).toBeInTheDocument();
  });
});
