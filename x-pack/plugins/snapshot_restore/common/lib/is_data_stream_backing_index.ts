/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * @remark
 * WARNING!
 *
 * This is a very hacky way of determining whether an index is a backing index.
 *
 * We only do this so that we can show users during a snapshot restore workflow
 * that an index is part of a data stream. At the moment there is no way for us
 * to get this information from the snapshot itself, even though it contains the
 * metadata for the data stream that information is fully opaque to us until after
 * we have done the snapshot restore.
 *
 * Issue for tracking this discussion here: https://github.com/elastic/elasticsearch/issues/58890
 */
export const isDataStreamBackingIndex = (indexName: string) => {
  return indexName.startsWith('.ds');
};
