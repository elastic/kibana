/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiIcon, EuiText } from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import type { RelatedCaseInfo } from '@kbn/cases-plugin/common/api';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CaseDetailsLink } from '../../../../../../common/components/links';
import { CASES_PANEL_CASE_STATUS } from '../translation';

const DescriptionText = styled(EuiText)`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

const ChildFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
`;

const StyledStatusText = styled.span`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

const StyledIcon = styled(EuiIcon)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

export const RelatedCasesList = ({
  relatedCases,
  maximumVisible,
}: {
  relatedCases: RelatedCaseInfo[];
  maximumVisible?: number;
}) => {
  // Sort related cases, showing the most recently created first.
  const sortedRelatedCases = useMemo(
    () =>
      relatedCases
        ? relatedCases.sort(
            (case1, case2) =>
              new Date(case2.createdAt).getTime() - new Date(case1.createdAt).getTime()
          )
        : [],
    [relatedCases]
  );

  // If a maximum visible count is provided, only show cases up to that amount
  const visibleCases = useMemo(
    () =>
      maximumVisible && maximumVisible > 0
        ? sortedRelatedCases.slice(0, maximumVisible)
        : sortedRelatedCases,
    [maximumVisible, sortedRelatedCases]
  );

  return (
    <>
      {visibleCases?.map(({ id, title, description, status, totals }) => (
        <EuiFlexItem key={id}>
          <CaseDetailsLink detailName={id} title={title}>
            {title}
          </CaseDetailsLink>
          <EuiSpacer size="s" />
          <DescriptionText color="subdued" size="relative">
            {description}
          </DescriptionText>
          <EuiSpacer size="s" />
          <ChildFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup dir="row" alignItems="center">
                <StyledStatusText>{`${CASES_PANEL_CASE_STATUS}:`}</StyledStatusText>
                <Status status={status} />
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup dir="row" alignItems="center" gutterSize="xl">
                <EuiFlexItem>
                  <EuiFlexGroup dir="row">
                    <StyledIcon type="editorComment" />
                    <span>{totals.userComments}</span>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup dir="row">
                    <StyledIcon type="alert" />
                    <span>{totals.alerts}</span>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </ChildFlexGroup>
        </EuiFlexItem>
      ))}
    </>
  );
};
