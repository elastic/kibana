/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { Case } from '../../containers/case/types';
import { getCaseDetailsUrl } from '../link_to/redirect_to_case';
import { Markdown } from '../markdown';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { navTabs } from '../../pages/home/home_navigations';
import { IconWithCount } from '../recent_timelines/counts';

import * as i18n from './translations';

const MarkdownContainer = styled.div`
  max-height: 150px;
  overflow-y: auto;
  width: 300px;
`;

const RecentCasesComponent = ({ cases }: { cases: Case[] }) => {
  const search = useGetUrlSearch(navTabs.case);

  return (
    <>
      {cases.map((c, i) => (
        <EuiFlexGroup key={c.id} gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink href={getCaseDetailsUrl({ id: c.id, search })}>{c.title}</EuiLink>
            </EuiText>

            <IconWithCount count={c.totalComment} icon={'editorComment'} tooltip={i18n.COMMENTS} />
            {c.description && c.description.length && (
              <MarkdownContainer>
                <EuiText color="subdued" size="xs">
                  <Markdown disableLinks={true} raw={c.description} />
                </EuiText>
              </MarkdownContainer>
            )}
            {i !== cases.length - 1 && <EuiSpacer size="l" />}
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
};

RecentCasesComponent.displayName = 'RecentCasesComponent';

export const RecentCases = React.memo(RecentCasesComponent);
