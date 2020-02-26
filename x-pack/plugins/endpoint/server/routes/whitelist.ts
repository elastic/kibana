/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
import { EndpointAppContext } from '../types';
import { WhitelistRule } from '../../common/types';

const whitelistIdx = 'whitelist-index';  // TODO: change this

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

/**
 * Handles the POST request for whitelist additions
 */
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

    const newRules: WhitelistRule[] = [];
    Object.keys(whitelistAttributeMap).forEach(k => {
      if (req.body[k]) {
        newRules.push({
          eventTypes: [], // TODO grab the alert and get eventTypes from alert details API
          whitelistRuleType: 'simple',
          whitelistRule: {
            type: 'equality',
            value: req.body[k],
            applyTo: whitelistAttributeMap[k],
          },
        });
      }
    });
    const errors = await addWhitelistRule(context, newRules); // TODO handle
    return res.ok({ body: newRules });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Handles the GET request for whitelist retrieval
 */
async function handleWhitelistGet(context, req, res) {
  try {
    const whitelist: WhitelistRule[] = await getWhitelist(context);
    return res.ok({ body: whitelist });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Add a whitelist rule to the global whitelist
 * @param ctx App context
 * @param whitelistRules List of whitelist rules to apply
 */
async function addWhitelistRule(ctx, whitelistRules: Array<WhitelistRule>): Promise<boolean> {
  let body = '';
  whitelistRules.forEach(rule => {
    body = body.concat(`{ "index" : {} }\n ${JSON.stringify(rule)}\n`);
  });

  const response = await ctx.core.elasticsearch.dataClient.callAsCurrentUser('bulk', {
    index: whitelistIdx,
    body,
  });
  const errors: boolean = response.errors;
  if (errors) {
    // TODO log errors
  }
  return errors
}

/**
 * Retrieve the global whitelist
 * @param ctx App context
 */
async function getWhitelist(ctx): Promise<WhitelistRule[]> {
  const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('search', {
    index: whitelistIdx,
    body: {},
  })) as SearchResponse<WhitelistRule>;

  const resp: WhitelistRule[] = [];
  response.hits.hits.forEach(hit => {
    resp.push(hit._source);
  });

  return resp;
}

/**
 * Determines whether a given string a valid UUID
 * @param str string to validate
 */
function validateUUID(str: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
}
