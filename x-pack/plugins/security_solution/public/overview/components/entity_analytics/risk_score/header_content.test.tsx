/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../../../../common/constants';
import { RiskScoreEntity, RiskSeverity } from '../../../../../common/search_strategy';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { RiskScoreHeaderContent } from './header_content';

jest.mock('../../../../common/components/links', () => {
  const actual = jest.requireActual('../../../../common/components/links');
  return {
    ...actual,
    useGetSecuritySolutionLinkProps: jest.fn(),
  };
});
const mockGetSecuritySolutionLinkProps = jest
  .fn()
  .mockReturnValue({ onClick: jest.fn(), href: '' });

describe('RiskScoreHeaderContent', () => {
  let res: RenderResult;
  jest.clearAllMocks();

  (useGetSecuritySolutionLinkProps as jest.Mock).mockReturnValue(mockGetSecuritySolutionLinkProps);
  beforeEach(() => {
    res = render(
      <RiskScoreHeaderContent
        entityDocLink="https://www.elastic.co/guide/en/security/current/user-risk-score.html"
        entityLinkProps={{
          deepLinkId: SecurityPageName.users,
          onClick: jest.fn(),
          path: '/userRisk',
        }}
        onSelectSeverityFilterGroup={jest.fn()}
        riskEntity={RiskScoreEntity.user}
        selectedSeverity={[]}
        severityCount={{
          [RiskSeverity.unknown]: 1,
          [RiskSeverity.low]: 2,
          [RiskSeverity.moderate]: 3,
          [RiskSeverity.high]: 4,
          [RiskSeverity.critical]: 5,
        }}
        toggleStatus={true}
      />
    );
  });
  it('should render when toggleStatus = true', () => {
    expect(res.getByTestId(`user-risk-score-header-content`)).toBeInTheDocument();
  });

  it('should render learn more button', () => {
    expect(res.getByText(`Learn more`)).toBeInTheDocument();
  });

  it('should render severity filter group', () => {
    expect(res.getByTestId(`risk-filter-button`)).toBeInTheDocument();
  });

  it('should render view all button', () => {
    expect(res.getByTestId(`view-all-button`)).toBeInTheDocument();
  });

  it('should not render if toggleStatus = false', () => {
    res = render(
      <RiskScoreHeaderContent
        entityDocLink="https://www.elastic.co/guide/en/security/current/user-risk-score.html"
        entityLinkProps={{
          deepLinkId: SecurityPageName.users,
          onClick: jest.fn(),
          path: '/userRisk',
        }}
        onSelectSeverityFilterGroup={jest.fn()}
        riskEntity={RiskScoreEntity.user}
        selectedSeverity={[]}
        severityCount={{
          [RiskSeverity.unknown]: 1,
          [RiskSeverity.low]: 2,
          [RiskSeverity.moderate]: 3,
          [RiskSeverity.high]: 4,
          [RiskSeverity.critical]: 5,
        }}
        toggleStatus={false}
      />
    );
    expect(res.getByTestId(`view-all-button`)).toBeInTheDocument();
  });
});
