/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CatIndicesParams } from 'elasticsearch';
import { IndexDataEnricher } from '../services';
import { Index, CallAsCurrentUser } from '../types';

interface Hit {
  health: string;
  status: string;
  index: string;
  uuid: string;
  pri: string;
  rep: string;
  'docs.count': any;
  'store.size': any;
  sth: 'true' | 'false';
  hidden: boolean;
}

interface IndexInfo {
  aliases: { [aliasName: string]: unknown };
  mappings: unknown;
  data_stream?: string;
  settings: {
    index: {
      hidden: 'true' | 'false';
    };
  };
}

interface GetIndicesResponse {
  [indexName: string]: IndexInfo;
}

async function fetchIndicesCall(
  callAsCurrentUser: CallAsCurrentUser,
  indexNames?: string[]
): Promise<Index[]> {
  const indexNamesString = indexNames && indexNames.length ? indexNames.join(',') : '*';

  // This call retrieves alias and settings (incl. hidden status) information about indices
  const indices: GetIndicesResponse = await callAsCurrentUser('transport.request', {
    method: 'GET',
    path: `/${indexNamesString}`,
    query: {
      expand_wildcards: 'hidden,all',
    },
  });

  if (!Object.keys(indices).length) {
    return [];
  }

  const catQuery: Pick<CatIndicesParams, 'format' | 'h'> & {
    expand_wildcards: string;
    index?: string;
  } = {
    format: 'json',
    h: 'health,status,index,uuid,pri,rep,docs.count,sth,store.size',
    expand_wildcards: 'hidden,all',
    index: indexNamesString,
  };

  // This call retrieves health and other high-level information about indices.
  const catHits: Hit[] = await callAsCurrentUser('transport.request', {
    method: 'GET',
    path: '/_cat/indices',
    query: catQuery,
  });

  // The two responses should be equal in the number of indices returned
  return catHits.map((hit) => {
    const index = indices[hit.index];
    const aliases = Object.keys(index.aliases);

    return {
      health: hit.health,
      status: hit.status,
      name: hit.index,
      uuid: hit.uuid,
      primary: hit.pri,
      replica: hit.rep,
      documents: hit['docs.count'],
      size: hit['store.size'],
      isFrozen: hit.sth === 'true', // sth value coming back as a string from ES
      aliases: aliases.length ? aliases : 'none',
      hidden: index.settings.index.hidden === 'true',
      data_stream: index.data_stream,
    };
  });
}

export const fetchIndices = async (
  callAsCurrentUser: CallAsCurrentUser,
  indexDataEnricher: IndexDataEnricher,
  indexNames?: string[]
) => {
  const indices = await fetchIndicesCall(callAsCurrentUser, indexNames);
  return await indexDataEnricher.enrichIndices(indices, callAsCurrentUser);
};
