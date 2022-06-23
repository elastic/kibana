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
} from '@elastic/eui';
import React, { useEffect } from 'react';
import { QueryClientProvider } from 'react-query';
import { CoreStart } from '@kbn/core/public';

import { FormattedRelative } from '@kbn/i18n-react';
import { useInView } from 'react-intersection-observer';

import { map } from 'lodash';
import { AGENT, AGENT_QUERY } from '../../agents/translations';
import { OsqueryActionType } from '../../../common/types';
import { useInfiniteAllActions } from '../../actions/use_all_actions';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
import { KibanaContextProvider } from '../../common/lib/kibana';

import { queryClient } from '../../query_client';
import { KibanaThemeProvider } from '../../shared_imports';
import { StartPlugins } from '../../types';
import { Direction } from '../../../common/search_strategy';

interface OsqueryResultsProps {
  agentIds: string[];
  ruleName: string;
  ruleActions: string[];
  eventDetailId: string;
}

const OsqueryResultsComponent: React.FC<OsqueryResultsProps> = ({
  agentIds,
  ruleName,
  ruleActions,
  eventDetailId,
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
    filterQuery: { terms: { 'data.id': map(ruleActions, 'params.message.id') } },
  });

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

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
              event={'attached query'}
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
                transparentBackground={!agentIds[0].length}
              >
                {agentIds[0]}
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
                // addToTimeline={}
              />
            </EuiComment>
          );
        })
      )}

      <div ref={ref}>{isFetchingNextPage && <EuiLoadingContent lines={5} />}</div>
    </div>
  );
};

export const OsqueryResults = React.memo(OsqueryResultsComponent);

type OsqueryResultsWrapperProps = { services: CoreStart & StartPlugins } & OsqueryResultsProps;

const OsqueryResultsWrapperComponent: React.FC<OsqueryResultsWrapperProps> = ({
  services,
  ...restProps
}) => (
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryResults {...restProps} />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryResultsWrapper = React.memo(OsqueryResultsWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryResultsWrapper as default };
