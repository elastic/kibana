/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary, EuiCodeBlock, EuiComment, EuiLoadingContent } from '@elastic/eui';
import React, { useEffect } from 'react';
import { QueryClientProvider } from 'react-query';
import { CoreStart } from '@kbn/core/public';

import { FormattedRelative } from '@kbn/i18n-react';
import { useInView } from 'react-intersection-observer';

import { map } from 'lodash';
import { useInfiniteAllActions } from '../../actions/use_all_actions';
import { ResultTabs } from '../../routes/saved_queries/edit/tabs';
// TODO change translations
import { KibanaContextProvider } from '../../common/lib/kibana';

import { queryClient } from '../../query_client';
import { KibanaThemeProvider } from '../../shared_imports';
import { StartPlugins } from '../../types';
import { Direction } from '../../../common/search_strategy';

interface OsqueryResultsProps {
  rawEventData: object | undefined;
}

const OsqueryResultsComponent: React.FC<OsqueryResultsProps> = ({ rawEventData }) => {
  const { ref, inView } = useInView();
  //
  // const permissions = useKibana().services.application.capabilities.osquery;
  //
  // const emptyPrompt = useMemo(
  //   () => (
  //     <EuiEmptyPrompt
  //       icon={<OsqueryIcon />}
  //       title={<h2>{SHORT_EMPTY_TITLE}</h2>}
  //       titleSize="xs"
  //       body={<p>{EMPTY_PROMPT}</p>}
  //     />
  //   ),
  //   []
  // );

  const agentIds = rawEventData?.fields['agent.id'];
  const ruleName = rawEventData?._source['kibana.alert.rule.name'];
  const ruleActions = rawEventData?._source['kibana.alert.rule.actions'];

  const {
    data: actionsData,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteAllActions({
    activePage: 0,
    limit: 100,
    direction: Direction.desc,
    sortField: '@timestamp',
    filterQuery: { terms: { 'data.id': map(ruleActions, 'params.message.id') } },
  });

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  return (
    <>
      {actionsData?.pages.map((page) =>
        page.actions?.map((ruleAction) => {
          const actionId = ruleAction._source.action_id;
          const query = ruleAction._source.data.query;
          const startDate = ruleAction?._source['@timestamp'];

          return (
            <EuiComment
              username={ruleName}
              timestamp={<FormattedRelative value={startDate} />}
              event={'attached query'}
              key={ruleAction._id}
            >
              Agent
              <EuiCodeBlock
                language="sql"
                fontSize="m"
                paddingSize="m"
                transparentBackground={!agentIds[0].length}
              >
                {agentIds[0]}
              </EuiCodeBlock>
              Query
              <EuiCodeBlock
                language="sql"
                fontSize="m"
                paddingSize="m"
                transparentBackground={!query.length}
              >
                {query}
              </EuiCodeBlock>
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
    </>
  );
};

export const OsqueryResults = React.memo(OsqueryResultsComponent);

type OsqueryResultsWrapperProps = { services: CoreStart & StartPlugins } & OsqueryResultsProps;

const OsqueryResultsWrapperComponent: React.FC<OsqueryResultsWrapperProps> = ({
  services,
  rawEventData,
}) => (
  <KibanaThemeProvider theme$={services.theme.theme$}>
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OsqueryResults rawEventData={rawEventData} />
        </QueryClientProvider>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);

const OsqueryResultsWrapper = React.memo(OsqueryResultsWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryResultsWrapper as default };
