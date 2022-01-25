/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { SecuritySolutionTemplateWrapper } from './';

jest.mock('./bottom_bar', () => ({
  ...jest.requireActual('./bottom_bar'),
  SecuritySolutionBottomBar: () => <div>{'Bottom Bar'}</div>,
}));

const mockSiemUserCanCrud = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          capabilities: {
            siem: mockSiemUserCanCrud(),
          },
        },
      },
    }),
  };
});

jest.mock('../../../common/components/navigation/use_security_solution_navigation', () => {
  return {
    useSecuritySolutionNavigation: () => ({
      icon: 'logoSecurity',
      items: [
        {
          id: 'investigate',
          name: 'Investigate',
          items: [
            {
              'data-href': 'some-data-href',
              'data-test-subj': 'navigation-cases',
              disabled: false,
              href: 'some-href',
              id: 'cases',
              isSelected: true,
              name: 'Cases',
            },
          ],
          tabIndex: undefined,
        },
      ],
      name: 'Security',
    }),
  };
});

const renderComponent = () => {
  return render(
    <TestProviders>
      <SecuritySolutionTemplateWrapper onAppLeave={() => null}>
        <div>{'child of wrapper'}</div>
      </SecuritySolutionTemplateWrapper>
    </TestProviders>
  );
};

describe('SecuritySolutionTemplateWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSiemUserCanCrud.mockReturnValue({ crud: true });
  });

  it('Should render to the page with bottom bar if user has SIEM crud', async () => {
    const { getByText } = renderComponent();
    expect(getByText('child of wrapper')).toBeInTheDocument();
    expect(getByText('Bottom Bar')).toBeInTheDocument();
  });

  it('Should not show bottom bar if user does not have SIEM crud', async () => {
    mockSiemUserCanCrud.mockReturnValue({ crud: false });

    const { getByText } = renderComponent();
    expect(getByText('child of wrapper')).toBeInTheDocument();
    expect(() => getByText('Bottom Bar')).toThrow();
  });
});
