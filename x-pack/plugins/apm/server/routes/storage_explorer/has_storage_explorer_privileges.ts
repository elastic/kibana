/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { every } from 'lodash';
import { uniq } from 'lodash';
import { ApmPluginRequestHandlerContext } from '../typings';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function hasStorageExplorerPrivileges({
  context,
  apmEventClient,
}: {
  context: ApmPluginRequestHandlerContext;
  apmEventClient: APMEventClient;
}) {
  const {
    indices: { transaction, span, metric, error },
  } = apmEventClient;

  const names = uniq(
    [transaction, span, metric, error].flatMap((indexPatternString) =>
      indexPatternString.split(',').map((indexPattern) => indexPattern.trim())
    )
  );

  const esClient = (await context.core).elasticsearch.client;
  const { index, cluster } =
    await esClient.asCurrentUser.security.hasPrivileges({
      body: {
        index: [
          {
            names,
            privileges: ['monitor'],
          },
        ],
        cluster: ['monitor'],
      },
    });

  const hasPrivileges = cluster.monitor && every(index, 'monitor');
  return hasPrivileges;
}
