/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { Case } from '../../../cases/containers/types';
import { getCaseDetailsUrl } from '../../../common/components/link_to/redirect_to_case';
import { Markdown } from '../../../common/components/markdown';
import { useFormatUrl } from '../../../common/components/link_to';
import { IconWithCount } from '../recent_timelines/counts';
import { LinkAnchor } from '../../../common/components/links';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';

const MarkdownContainer = styled.div`
  max-height: 150px;
  overflow-y: auto;
  width: 300px;
`;

const RecentCasesComponent = ({ cases }: { cases: Case[] }) => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { navigateToApp } = useKibana().services.application;

  return (
    <>
      {cases.map((c, i) => (
        <EuiFlexGroup key={c.id} gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <LinkAnchor
                onClick={(ev: { preventDefault: () => void }) => {
                  ev.preventDefault();
                  navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
                    path: getCaseDetailsUrl({ id: c.id, search }),
                  });
                }}
                href={formatUrl(getCaseDetailsUrl({ id: c.id }))}
              >
                {c.title}
              </LinkAnchor>
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
