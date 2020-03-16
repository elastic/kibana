/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandlerContext, APICaller } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
import { createHash } from 'crypto';

import lzma from 'lzma-native';
import { WhitelistRule, WhitelistSet } from '../../common/types';
import { EndpointAppContext } from '../types';

const whitelistIdx = 'whitelist'; // TODO: change this
let whitelistArtifactCache: Buffer = Buffer.from([]);

/**
 * Registers the whitelist routes for the API
 */
export function registerWhitelistRoutes(
  router: IRouter,
  endpointAppContext: EndpointAppContext,
  cl: APICaller
) {
  hydrateWhitelistCache(cl);
  router.get(
    {
      path: '/api/endpoint/whitelist',
      validate: {},
      options: { authRequired: true },
    },
    handleWhitelistGet
  );

  router.get(
    {
      path: '/api/endpoint/manifest',
      validate: {},
      options: { authRequired: true },
    },
    handleWhitelistManifest
  );

  router.get(
    {
      path: '/api/endpoint/whitelist/download/{hash}',
      validate: {
        params: schema.object({
          hash: schema.string(),
        }),
      },
      options: { authRequired: true },
    },
    handleWhitelistDownload // TODO
  );

  router.post(
    {
      path: '/api/endpoint/whitelist',
      validate: {
        body: schema.object({
          comment: schema.maybe(schema.string()), // Optional comment explaining reason for whitelist
          event_types: schema.maybe(schema.arrayOf(schema.string())), // TODO
          file_path: schema.maybe(schema.string()),
          signer: schema.maybe(schema.string()),
          sha256: schema.maybe(schema.string()),
          dismiss: schema.boolean({ defaultValue: false }), // Boolean determining if we dismiss all alerts that match this
        }),
      },
      options: { authRequired: true },
    },
    handleWhitelistPost
  );

  router.delete(
    {
      path: '/api/endpoint/whitelist',
      validate: {
        body: schema.object({
          whitelist_id: schema.string(),
        }),
      },
      options: { authRequired: true },
    },
    handleWhitelistItemDeletion
  );
}

/**
 * Handles the POST request for whitelist additions
 */
async function handleWhitelistPost(context: RequestHandlerContext, req, res) {
  try {
    const eventTypes: string[] = req.body.eventTypes;
    const whitelistAttributeMap: Record<string, string> = {
      file_path: 'malware.file.path',
      acting_process_path: 'actingProcess.file.path',
      signer: 'malware.file.signer',
      sha256: 'malware.file.hashes.sha256',
    };
    const newRules: WhitelistRule[] = [];
    Object.keys(whitelistAttributeMap).forEach(k => {
      if (req.body[k]) {
        newRules.push({
          comment: req.body.comment || '',
          eventTypes,
          whitelistRuleType: 'simple',
          whitelistRule: {
            type: 'equality',
            value: req.body[k],
            applyTo: whitelistAttributeMap[k],
          },
        });
      }
    });

    // Don't index an empty list if no rules could be created from the request
    if (newRules.length === 0) {
      return res.badRequest({ error: 'no whitelist rules could be created from request.' });
    }

    const createdItemIDs = await addWhitelistRule(context, newRules); // TODO handle
    if (createdItemIDs.length === 0) {
      return res.internalError({ error: 'unable to create whitelist rule.' });
    } else {
      const cl = context.core.elasticsearch.dataClient.callAsCurrentUser;
      hydrateWhitelistCache(cl);

      let idx = 0;
      createdItemIDs.forEach((id: string) => {
        newRules[idx].id = id;
        idx++;
      });
      return res.ok({ body: newRules });
    }
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Add a whitelist rule to the global whitelist
 * @param ctx App context
 * @param whitelistRules List of whitelist rules to apply
 */
async function addWhitelistRule(ctx, whitelistRules: WhitelistRule[]): Promise<string[]> {
  let body = '';
  whitelistRules.forEach(rule => {
    body = body.concat(`{ "index" : {}}\n ${JSON.stringify(rule)}\n`);
  });

  const response = await ctx.core.elasticsearch.dataClient.callAsCurrentUser('bulk', {
    index: whitelistIdx,
    refresh: 'true',
    body,
  });

  const errors: boolean = response.errors;
  if (errors) {
    // TODO log errors
  } else {
    // Responses from `bulk` are guaranteed to be in order https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html
    return response.items.map(indexResponse => {
      return indexResponse.index._id;
    });
  }
  return [];
}

/**
 * Handles the GET request for whitelist retrieval
 */
async function handleWhitelistGet(context, req, res) {
  try {
    const cl: APICaller = context.core.elasticsearch.dataClient.callAsCurrentUser;
    const whitelist: WhitelistSet = await getWhitelist(cl);
    return res.ok({ body: whitelist });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Retrieve the global whitelist
 * @param ctx App context
 */
async function getWhitelist(client: APICaller): Promise<WhitelistSet> {
  const response = (await client('search', {
    index: whitelistIdx,
    body: {},
    size: 1000, // TODO
  })) as SearchResponse<WhitelistRule>;

  const resp: WhitelistRule[] = [];
  response.hits.hits.forEach(hit => {
    const whitelist = hit._source;
    whitelist.id = hit._id;
    resp.push(whitelist);
  });

  return { entries: resp };
}

/**
 * Handles the GET request for whitelist manifest
 */
async function handleWhitelistManifest(context, req, res) {
  try {
    const manifest = await getWhitelistManifest(context);
    return res.ok({ body: manifest });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Creates the manifest for the whitelist
 */
async function getWhitelistManifest(ctx) {
  if (whitelistArtifactCache.length === 0) {
    hydrateWhitelistCache(ctx.core.elasticsearch.dataClient.callAsCurrentUser);
  }
  const hash = createHash('sha256')
    .update(whitelistArtifactCache.toString('utf8'), 'utf8')
    .digest('hex');

  const manifest = {
    schemaVersion: '1.0.0',
    manifestVersion: '1.0.0',
    artifacts: {
      'global-whitelist': {
        url: `api/endpoint/whitelist/download/${hash}`,
        sha256: hash,
        size: whitelistArtifactCache.byteLength,
        encoding: 'xz',
      },
    },
  };
  return manifest;
}

/**
 * Compresses the whitelist and puts it into the in memory cache
 */
function cacheWhitelistArtifact(whitelist: WhitelistSet) {
  lzma.compress(JSON.stringify(whitelist), (res: Buffer) => {
    whitelistArtifactCache = res;
  });
}

/**
 * Hydrate the in memory whitelist cache
 */
function hydrateWhitelistCache(client: APICaller) {
  getWhitelist(client)
    .then((wl: WhitelistSet) => {
      cacheWhitelistArtifact(wl);
    })
    .catch(e => {}); // TODO log
}

/**
 * Handles the GET request for downloading the whitelist
 */
async function handleWhitelistDownload(context, req, res) {
  try {
    const whitelistHash: string = req.params.hash;
    const bufferHash = createHash('sha256')
      .update(whitelistArtifactCache.toString('utf8'), 'utf8')
      .digest('hex');
    if (whitelistHash !== bufferHash) {
      return res.badRequest({
        body: `The requested artifact with hash ${whitelistHash} does not match current hash of ${bufferHash}`,
      });
    }
    return res.ok({ body: whitelistArtifactCache, headers: { 'content-encoding': 'xz' } });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Handles the DELETE request for removing a whitelist rule from the whitelist
 */
async function handleWhitelistItemDeletion(context, req, res) {
  try {
    const whitelistID: string = req.body.whitelist_id;
    return context.core.elasticsearch.dataClient
      .callAsCurrentUser('delete', {
        index: whitelistIdx,
        id: whitelistID,
        refresh: 'true',
      })
      .then(r => {
        return res.ok({ body: `Successfully deleted ${whitelistID}` });
      })
      .catch(e => {
        if (e.status === 404) {
          return res.badRequest({ body: `No item with id ${whitelistID} in global whitelist` });
        } else {
          return res.internalError({});
        }
      });
  } catch (err) {
    return res.internalError({ body: err });
  }
}
