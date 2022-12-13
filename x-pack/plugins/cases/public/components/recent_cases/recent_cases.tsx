/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { IconWithCount } from './icon_with_count';
import * as i18n from './translations';
import { CaseDetailsLink } from '../links';
import { LoadingPlaceholders } from './loading_placeholders';
import { NoCases } from './no_cases';
import { MarkdownRenderer } from '../markdown_editor';
import type { FilterOptions } from '../../containers/types';
import { TruncatedText } from '../truncated_text';
import { initialData as initialGetCasesData, useGetCases } from '../../containers/use_get_cases';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesContext } from '../cases_context/use_cases_context';

const MarkdownContainer = styled.div`
  max-height: 150px;
  overflow-y: auto;
  width: 300px;
`;

export interface RecentCasesProps {
  filterOptions: Partial<FilterOptions>;
  maxCasesToShow: number;
}

export const RecentCasesComp = ({ filterOptions, maxCasesToShow }: RecentCasesProps) => {
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
    <NoCases />
  ) : (
    <>
      {data.cases.map((c, i) => (
        <EuiFlexGroup key={c.id} gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <CaseDetailsLink detailName={c.id} title={c.title}>
                <TruncatedText text={c.title} />
              </CaseDetailsLink>
            </EuiText>

            <IconWithCount count={c.totalComment} icon={'editorComment'} tooltip={i18n.COMMENTS} />
            {c.description && c.description.length && (
              <MarkdownContainer>
                <EuiText color="subdued" size="xs">
                  <MarkdownRenderer disableLinks={true}>{c.description}</MarkdownRenderer>
                </EuiText>
              </MarkdownContainer>
            )}
            {i !== data.cases.length - 1 && <EuiSpacer size="l" />}
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
};
RecentCasesComp.displayName = 'RecentCasesComp';
