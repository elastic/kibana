/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
import { EndpointAppContext } from '../types';

const whitelistIdx = 'whitelist-index';

export function registerWhitelistRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: '/api/endpoint/whitelist',
      validate: {},
      options: { authRequired: true },
    },
    handleWhitelistGet
  );

  const INVALID_UUID = "`alert_id` Must be a UUID.'";
  router.post(
    {
      path: '/api/endpoint/whitelist',
      validate: {
        body: schema.object({
          comment: schema.maybe(schema.string()), // Optional comment explaining reason for whitelist
          alert_id: schema.string({
            minLength: 36, // https://tools.ietf.org/html/rfc4122#section-3
            maxLength: 36,
            validate(value) {
              // Must be a UUID
              if (!validateUUID(value)) {
                return INVALID_UUID;
              }
            },
          }),
          file_path: schema.maybe(schema.string()),
          signer: schema.maybe(schema.string()),
          sha256: schema.maybe(schema.string()),
          dismiss: schema.boolean({ defaultValue: false }), // Boolean determining if we dismiss all alerts that match this
        }),
      },
      options: { authRequired: false }, // Change me
    },
    handleWhitelistPost
  );
}

async function handleWhitelistPost(context, req, res) {
  try {
    // TODO check if one of whitelist fields exists
    const alertId: string = req.body.alert_id;

    const whitelistAttributeMap: Record<string, string> = {
      file_path: 'malware.file.path',
      process_signer: 'actingProcess.file.signer',
      signer: 'malware.file.signer',
      sha256: 'malware.file.hashes.sha256',
    };

    // TODO get the full list of whitelist rules and append
    const newRules: object[] = [];
    Object.keys(whitelistAttributeMap).forEach(k => {
      if (req.body[k]) {
        newRules.push({
          eventTypes: [], // TODO grab the alert and get eventTypes
          whitelistRuleType: 'simple',
          whitelistRule: {
            type: 'equality',
            value: req.body[k],
            applyTo: whitelistAttributeMap[k],
          },
        });
      }
    });
    await addWhitelistRule(context, newRules);
    return res.ok({ body: newRules });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

async function handleWhitelistGet(context, req, res) {
  try {
    const whitelist = await getWhitelist(context);
    return res.ok({ body: whitelist });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

async function addWhitelistRule(ctx, whitelistRules: Array<Record<string, any>>) {
  let body = '';
  whitelistRules.forEach(rule => {
    body = body.concat(`{ "index" : {} }\n ${JSON.stringify(rule)}\n`);
  });

  const response = await ctx.core.elasticsearch.dataClient.callAsCurrentUser('bulk', {
    index: whitelistIdx,
    body,
  });
}

async function getWhitelist(ctx) {
  const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('search', {
    index: whitelistIdx,
    body: {},
  })) as SearchResponse<any>; // TODO

  const resp: object[] = [];
  response.hits.hits.forEach(hit => {
    resp.push(hit._source);
  });

  return resp;
}

function validateUUID(str: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
}
