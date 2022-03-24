/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from 'kibana/server';
import { IRouter } from '../../../../../src/core/server';
import { ALERT_STATUS_ROUTE, ALERTS_INDEX, ALERT_UUID_PROPERTY } from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';

export const registerAlertStatusRoute = (router: IRouter) => {
  router.get(
    {
      path: ALERT_STATUS_ROUTE,
      validate: {
        query: schema.object({
          alertUuid: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;
      const { alertUuid } = request.query;
      const body = await searchAlertByUuid(client, alertUuid);

      return response.ok({ body });
    }
  );
};

export const searchAlertByUuid = async (client: ElasticsearchClient, alertUuid: string) => {
  const search = await client.search({
    index: [ALERTS_INDEX],
    ignore_unavailable: true, // on a new installation the .siem-signals-default index might not be created yet.
    body: {
      query: {
        match: {
          [ALERT_UUID_PROPERTY]: alertUuid,
        },
      },
      size: 1,
    },
  });

  const events = search.hits.hits.map((hit: any) => {
    // TODO: re-eval if this is needed after updated ECS mappings are applied.
    // the .siem-signals-default index flattens many properties. this util unflattens them.
    hit._source = expandDottedObject(hit._source);

    return hit;
  });

  return { events };
};
