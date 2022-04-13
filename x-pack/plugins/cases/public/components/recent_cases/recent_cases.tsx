/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useEffect, useMemo, useRef } from 'react';
import { isEqual } from 'lodash/fp';
import styled from 'styled-components';

import { IconWithCount } from './icon_with_count';
import * as i18n from './translations';
import { useGetCases } from '../../containers/use_get_cases';
import { CaseDetailsLink } from '../links';
import { LoadingPlaceholders } from './loading_placeholders';
import { NoCases } from './no_cases';
import { MarkdownRenderer } from '../markdown_editor';
import { FilterOptions } from '../../containers/types';
import { TruncatedText } from '../truncated_text';

const MarkdownContainer = styled.div`
  max-height: 150px;
  overflow-y: auto;
  width: 300px;
`;

export interface RecentCasesProps {
  filterOptions: Partial<FilterOptions>;
  maxCasesToShow: number;
}

const usePrevious = (value: Partial<FilterOptions>) => {
  const ref = useRef();
  useEffect(() => {
    (ref.current as unknown) = value;
  });
  return ref.current;
};

export const RecentCasesComp = ({ filterOptions, maxCasesToShow }: RecentCasesProps) => {
  const previousFilterOptions = usePrevious(filterOptions);
  const { data, loading, setFilters } = useGetCases({
    initialQueryParams: { perPage: maxCasesToShow },
  });

  useEffect(() => {
    if (previousFilterOptions !== undefined && !isEqual(previousFilterOptions, filterOptions)) {
      setFilters(filterOptions);
    }
  }, [previousFilterOptions, filterOptions, setFilters]);

  const isLoadingCases = useMemo(
    () => loading.indexOf('cases') > -1 || loading.indexOf('caseUpdate') > -1,
    [loading]
  );

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
