/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import { ApmPluginRequestHandlerContext } from '../../typings';
import { Setup } from '../../../lib/helpers/setup_request';

export async function getTotalIndexDiskUsage({
  context,
  setup,
}: {
  context: ApmPluginRequestHandlerContext;
  setup: Setup;
}) {
  const {
    indices: { transaction, span, metric, error },
  } = setup;

  const index = uniq([transaction, span, metric, error]).join();
  const esClient = (await context.core).elasticsearch.client;
  const diskUsage = await esClient.asCurrentUser.indices.stats({ index });

  return diskUsage._all.total?.store?.size_in_bytes;
}
