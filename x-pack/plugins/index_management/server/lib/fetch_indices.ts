/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CatIndicesParams } from 'elasticsearch';
import { IndexDataEnricher } from '../services';
import { CallAsCurrentUser } from '../types';
import { Index } from '../index';

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
    // transport.request doesn't do any URI encoding, unlike other JS client APIs. This enables
    // working with Logstash indices with names like %{[@metadata][beat]}-%{[@metadata][version]}.
    path: `/${encodeURIComponent(indexNamesString)}`,
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

  // System indices may show up in _cat APIs, as these APIs are primarily used for troubleshooting
  // For now, we filter them out and only return index information for the indices we have
  // In the future, we should migrate away from using cat APIs (https://github.com/elastic/kibana/issues/57286)
  return catHits.reduce((decoratedIndices, hit) => {
    const index = indices[hit.index];

    if (typeof index !== 'undefined') {
      const aliases = Object.keys(index.aliases);

      decoratedIndices.push({
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
      });
    }

    return decoratedIndices;
  }, [] as Index[]);
}

export const fetchIndices = async (
  callAsCurrentUser: CallAsCurrentUser,
  indexDataEnricher: IndexDataEnricher,
  indexNames?: string[]
) => {
  const indices = await fetchIndicesCall(callAsCurrentUser, indexNames);
  return await indexDataEnricher.enrichIndices(indices, callAsCurrentUser);
};
