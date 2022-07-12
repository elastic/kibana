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
  EuiLoadingContent,
  EuiText,
  EuiSpacer,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { QueryClientProvider } from 'react-query';
import type { CoreStart } from '@kbn/core/public';

import { FormattedRelative } from '@kbn/i18n-react';
import { useInView } from 'react-intersection-observer';

import { map } from 'lodash';
import styled from 'styled-components';
import { AGENT, AGENT_QUERY, ATTACHED_QUERY } from '../../agents/translations';
import type { OsqueryActionType } from '../../../common/types';
import { useInfiniteAllActions } from '../../actions/use_all_actions';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { KibanaContextProvider } from '../../common/lib/kibana';

import { queryClient } from '../../query_client';
import { KibanaThemeProvider } from '../../shared_imports';
import type { StartPlugins } from '../../types';
import { Direction } from '../../../common/search_strategy';
import type { OsqueryActionResultsProps } from './types';

const StyledScrolledEuiFlexItem = styled(EuiFlexItem)`
  overflow-y: auto;
  max-height: 60px;
`;

const OsqueryActionResultsComponent: React.FC<OsqueryActionResultsProps> = ({
  agentIds,
  ruleName,
  ruleActions,
  eventDetailId,
  addToTimeline,
}) => {
  const { ref, inView } = useInView();

  const {
    data: actionsData,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteAllActions({
    activePage: 0,
    limit: 100,
    direction: Direction.desc,
    sortField: '@timestamp',
    eventDetailId,
    // @ts-expect-error terms is fine
    filterQuery: { terms: { 'data.id': map(ruleActions, 'params.id') } },
  });

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

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
      {actionsData?.pages.map((page) =>
        (page.actions as Array<{ _source: OsqueryActionType; _id: string }>)?.map((ruleAction) => {
          const actionId = ruleAction._source.action_id;
          const query = ruleAction._source.data?.query as string;
          const startDate = ruleAction?._source['@timestamp'];

          return (
            <EuiComment
              username={ruleName}
              timestamp={<FormattedRelative value={startDate} />}
              event={ATTACHED_QUERY}
              data-test-subj={'osquery-results-comment'}
              key={ruleAction._id}
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
              <EuiCodeBlock
                language="sql"
                fontSize="m"
                paddingSize="m"
                transparentBackground={!query.length}
              >
                {query}
              </EuiCodeBlock>
              <EuiSpacer size="xxl" />
              <ResultTabs
                actionId={actionId}
                agentIds={agentIds}
                startDate={startDate}
                addToTimeline={addToTimeline}
              />
            </EuiComment>
          );
        })
      )}

      <div ref={ref}>{isFetchingNextPage && <EuiLoadingContent lines={5} />}</div>
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
