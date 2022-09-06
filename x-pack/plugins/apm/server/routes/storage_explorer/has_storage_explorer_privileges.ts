/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { every } from 'lodash';
import { ApmPluginRequestHandlerContext } from '../typings';
import { Setup } from '../../lib/helpers/setup_request';

export async function hasStorageExplorerPrivileges({
  context,
  setup,
}: {
  context: ApmPluginRequestHandlerContext;
  setup: Setup;
}) {
  const {
    indices: { transaction, span, metric, error },
  } = setup;

  const apmIndices: string[] = [];
  [transaction, span, metric, error].forEach((indicesForProcessorEvent) => {
    apmIndices.push(...indicesForProcessorEvent.replace(/\s/g, '').split(','));
  });

  const esClient = (await context.core).elasticsearch.client;
  const { index } = await esClient.asCurrentUser.security.hasPrivileges({
    body: {
      index: apmIndices.map((idx) => ({
        names: [idx],
        privileges: ['monitor'],
      })),
    },
  });

  const hasPrivileges = every(index, 'monitor');
  return hasPrivileges;
}
