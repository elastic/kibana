/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';
import { FormattedRelative } from '@kbn/i18n-react';

import { LocalizedDateTooltip } from '../localized_date_tooltip';
import { IconWithCount } from './icon_with_count';
import * as i18n from './translations';
import { CaseDetailsLink } from '../links';
import { LoadingPlaceholders } from './loading_placeholders';
import { NoCases } from './no_cases';
import type { FilterOptions } from '../../containers/types';
import { TruncatedText } from '../truncated_text';
import { MarkdownRenderer } from '../markdown_editor';
import { initialData as initialGetCasesData, useGetCases } from '../../containers/use_get_cases';
import type { FilterMode as RecentCasesFilterMode } from './types';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesContext } from '../cases_context/use_cases_context';

const MarkdownContainer = styled.div`
  ${({ theme }) => css`
    max-height: 150px;
    overflow-y: auto;
    color: ${theme.eui.euiTextSubduedColor};
  `}
`;

const TruncateComp = styled.div`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

export interface RecentCasesProps {
  filterOptions: Partial<FilterOptions>;
  maxCasesToShow: number;
  recentCasesFilterBy: RecentCasesFilterMode;
}

export const RecentCasesComp = React.memo<RecentCasesProps>(
  ({ filterOptions, maxCasesToShow, recentCasesFilterBy }) => {
    const { owner } = useCasesContext();
    const availableSolutions = useAvailableCasesOwners(['read']);
    const hasOwner = !!owner.length;

    const { data = initialGetCasesData, isLoading: isLoadingCases } = useGetCases({
      queryParams: { perPage: maxCasesToShow },
      filterOptions: { ...filterOptions, owner: hasOwner ? owner : availableSolutions },
    });

    return isLoadingCases ? (
      <LoadingPlaceholders lines={2} placeholders={3} />
    ) : !isLoadingCases && data.cases.length === 0 ? (
      <NoCases recentCasesFilterBy={recentCasesFilterBy} />
    ) : (
      <>
        {data.cases.map((c, i) => (
          <EuiFlexGroup key={c.id} gutterSize="none">
            <EuiFlexItem>
              <EuiText size="s">
                <CaseDetailsLink detailName={c.id} title={c.title}>
                  <TruncatedText text={c.title} />
                </CaseDetailsLink>
              </EuiText>
              <EuiSpacer size="xs" />
              {c.description && c.description.length && (
                <MarkdownContainer>
                  <TruncateComp>
                    <MarkdownRenderer disableLinks={true} textSize="relative">
                      {c.description}
                    </MarkdownRenderer>
                  </TruncateComp>
                </MarkdownContainer>
              )}
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="default"
                    data-test-subj="recent-cases-creation-relative-time"
                  >
                    <LocalizedDateTooltip date={new Date(c.createdAt)}>
                      <FormattedRelative value={c.createdAt} />
                    </LocalizedDateTooltip>
                  </EuiText>
                </EuiFlexItem>
                <IconWithCount
                  count={c.totalComment}
                  icon={'editorComment'}
                  tooltip={i18n.COMMENTS}
                />
              </EuiFlexGroup>
              {i !== data.cases.length - 1 && <EuiSpacer size="l" />}
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </>
    );
  }
);
RecentCasesComp.displayName = 'RecentCasesComp';
