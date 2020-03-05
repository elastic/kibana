/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ApolloClient } from 'apollo-client';
import { TimeKey } from '../../../../common/time';
import { logEntriesQuery } from '../../../graphql/log_entries.gql_query';
import { useApolloClient } from '../../../utils/apollo_context';
import { LogEntriesResponse } from '.';

const LOAD_CHUNK_SIZE = 200;

type LogEntriesGetter = (
  client: ApolloClient<{}>,
  countBefore: number,
  countAfter: number
) => (params: {
  sourceId: string;
  timeKey: TimeKey | null;
  filterQuery: string | null;
}) => Promise<LogEntriesResponse>;

const getLogEntries: LogEntriesGetter = (client, countBefore, countAfter) => async ({
  sourceId,
  timeKey,
  filterQuery,
}) => {
  if (!timeKey) throw new Error('TimeKey is null');
  const result = await client.query({
    query: logEntriesQuery,
    variables: {
      sourceId,
      timeKey: { time: timeKey.time, tiebreaker: timeKey.tiebreaker },
      countBefore,
      countAfter,
      filterQuery,
    },
    fetchPolicy: 'no-cache',
  });
  // Workaround for Typescript. Since we're removing the GraphQL API in another PR or two
  // 7.6 goes out I don't think it's worth the effort to actually make this
  // typecheck pass
  const { source } = result.data as any;
  const { logEntriesAround } = source;
  return {
    entries: logEntriesAround.entries,
    entriesStart: logEntriesAround.start,
    entriesEnd: logEntriesAround.end,
    hasMoreAfterEnd: logEntriesAround.hasMoreAfter,
    hasMoreBeforeStart: logEntriesAround.hasMoreBefore,
    lastLoadedTime: new Date(),
  };
};

export const useGraphQLQueries = () => {
  const client = useApolloClient();
  if (!client) throw new Error('Unable to get Apollo Client from context');
  return {
    getLogEntriesAround: getLogEntries(client, LOAD_CHUNK_SIZE, LOAD_CHUNK_SIZE),
    getLogEntriesBefore: getLogEntries(client, LOAD_CHUNK_SIZE, 0),
    getLogEntriesAfter: getLogEntries(client, 0, LOAD_CHUNK_SIZE),
  };
};
