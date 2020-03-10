/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
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
export function registerWhitelistRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
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
      path: '/api/endpoint/whitelist/download/{id}',
      validate: {},
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
          event_types: schema.arrayOf(schema.string()),
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
}

/**
 * Handles the POST request for whitelist additions
 */
async function handleWhitelistPost(context, req, res) {
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

    const errors = await addWhitelistRule(context, newRules); // TODO handle
    if (errors) {
      return res.internalError({ error: 'unable to create whitelist rule.' });
    } else {
      await hydrateWhitelistCache(context);
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
async function addWhitelistRule(ctx, whitelistRules: WhitelistRule[]): Promise<boolean> {
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
  }
  return errors;
}

/**
 * Handles the GET request for whitelist retrieval
 */
async function handleWhitelistGet(context, req, res) {
  try {
    const whitelist: WhitelistSet = await getWhitelist(context);
    return res.ok({ body: whitelist });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Retrieve the global whitelist
 * @param ctx App context
 */
async function getWhitelist(ctx): Promise<WhitelistSet> {
  const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('search', {
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
    hydrateWhitelistCache(ctx);
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
function cacheWhitelistArtifact(ctx, whitelist: WhitelistSet) {
  // TODO time and log
  lzma.compress(JSON.stringify(whitelist), (res: Buffer) => {
    whitelistArtifactCache = res;
  });
}

/**
 * Hydrate the in memory whitelist cache
 */
function hydrateWhitelistCache(ctx) {
  getWhitelist(ctx)
    .then((wl: WhitelistSet) => {
      cacheWhitelistArtifact(ctx, wl);
    })
    .catch(e => {
      console.log(e);
    });
}

/**
 * Handles the GET request for downloading the whitelist
 */
async function handleWhitelistDownload(context, req, res) {
  try {
    if (whitelistArtifactCache.length === 0) {
      hydrateWhitelistCache(context);
    }
    return res.ok({ body: whitelistArtifactCache }); // TODO
  } catch (err) {
    return res.internalError({ body: err });
  }
}
