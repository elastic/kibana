/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiErrorBoundary,
  EuiCodeBlock,
  EuiComment,
  EuiText,
  EuiSpacer,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';

import { FormattedRelative } from '@kbn/i18n-react';

import styled from 'styled-components';
import { useAllLiveQueries } from '../../actions/use_all_live_queries';
import { AGENT, AGENT_QUERY, ATTACHED_QUERY } from '../../agents/translations';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { KibanaContextProvider } from '../../common/lib/kibana';
import { Direction } from '../../../common/search_strategy';

import { queryClient } from '../../query_client';
import { KibanaThemeProvider } from '../../shared_imports';
import type { StartPlugins } from '../../types';
import type { OsqueryActionResultsProps } from './types';

const StyledScrolledEuiFlexItem = styled(EuiFlexItem)`
  overflow-y: auto;
  max-height: 60px;
`;

const OsqueryActionResultsComponent: React.FC<OsqueryActionResultsProps> = ({
  agentIds,
  ruleName,
  alertId,
  addToTimeline,
}) => {
  const { data: actionsData } = useAllLiveQueries({
    filterQuery: { term: { alert_ids: alertId } },
    activePage: 0,
    limit: 100,
    direction: Direction.desc,
    sortField: '@timestamp',
  });
  const agentsList = useMemo(
    () => (
      <StyledScrolledEuiFlexItem>
        {agentIds?.map((agent, id) => (
          <EuiFlexItem key={id}>{agent}</EuiFlexItem>
        ))}
      </StyledScrolledEuiFlexItem>
    ),
    [agentIds]
  );

  return (
    <div data-test-subj={'osquery-results'}>
      {actionsData?.data.items.map((item) => {
        const actionId = item.fields?.action_id[0];
        const query = item.fields?.['queries.query']?.[0];
        const startDate = item.fields?.['@timestamp'][0];

        return (
          <EuiComment
            username={ruleName && ruleName[0]}
            timestamp={<FormattedRelative value={startDate} />}
            event={ATTACHED_QUERY}
            data-test-subj={'osquery-results-comment'}
            key={item._id}
          >
            <EuiSpacer size="m" />
            <EuiText>
              <h6>{AGENT}</h6>
            </EuiText>
            <EuiCodeBlock
              language="sql"
              fontSize="m"
              paddingSize="m"
              transparentBackground={agentIds && !agentIds[0].length}
            >
              {agentsList}
            </EuiCodeBlock>
            <EuiSpacer size="m" />
            <EuiText>
              <h6>{AGENT_QUERY}</h6>
            </EuiText>
            {query?.length ? (
              <EuiCodeBlock
                language="sql"
                fontSize="m"
                paddingSize="m"
                transparentBackground={!query.length}
              >
                {query}
              </EuiCodeBlock>
            ) : (
              <div>pack</div>
            )}

            <EuiSpacer size="xxl" />
            <ResultTabs
              actionId={actionId}
              agentIds={agentIds}
              startDate={startDate}
              addToTimeline={addToTimeline}
            />
          </EuiComment>
        );
      })}
    </div>
  );
};

export const OsqueryActionResults = React.memo(OsqueryActionResultsComponent);

type OsqueryActionResultsWrapperProps = {
  services: CoreStart & StartPlugins;
} & OsqueryActionResultsProps;

const OsqueryActionResultsWrapperComponent: React.FC<OsqueryActionResultsWrapperProps> = ({
  services,
  ...restProps
}) => (
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryActionResults {...restProps} />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryActionResultsWrapper = React.memo(OsqueryActionResultsWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionResultsWrapper as default };
