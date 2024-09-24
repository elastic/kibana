/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { Client } from '@elastic/elasticsearch';
import { REPO_ROOT } from '@kbn/repo-info';
import { extractDocumentation } from './extract_documentation';
import { indexDocuments } from './index_documents';
import { createTargetIndex } from './create_index';
import { installElser } from './install_elser';
import { writeToDisk } from './write_to_disk';
import { performSemanticSearch } from './perform_semantic_search';

const sourceCluster = {
  url: '[REDACTED]',
  username: '[REDACTED]',
  password: '[REDACTED]',
};

const embeddingCluster = {
  url: 'http://localhost:9200',
  username: 'elastic',
  password: 'changeme',
};

const sourceClient = new Client({
  compression: true,
  nodes: [sourceCluster.url],
  auth: {
    username: sourceCluster.username,
    password: sourceCluster.password,
  },
});

const embeddingClient = new Client({
  compression: true,
  nodes: [embeddingCluster.url],
  auth: {
    username: embeddingCluster.username,
    password: embeddingCluster.password,
  },
  requestTimeout: 10 * 60 * 1000,
});

const run = async () => {
  await installElser({ client: embeddingClient });

  const documents = await extractDocumentation({
    client: sourceClient,
    index: 'search-docs-1',
    productName: 'Kibana',
    stackVersion: '8.15',
  });

  // const targetIndex = `kb-test-${pseudoRandSuffix()}`;
  const targetIndex = `kb-test-42`;

  await createTargetIndex({
    client: embeddingClient,
    indexName: targetIndex,
  });

  await indexDocuments({
    client: embeddingClient,
    index: targetIndex,
    documents,
  });

  const targetFolder = Path.join(REPO_ROOT, 'knowledge-base', 'Kibana');

  await writeToDisk({
    index: targetIndex,
    client: embeddingClient,
    productName: 'Kibana',
    destFolder: targetFolder,
  });

  const results = await performSemanticSearch({
    client: embeddingClient,
    index: targetIndex,
    searchQuery: 'How to enable TLS for Kibana?',
  });

  results.forEach((result) => {
    console.log(`result: ${result._source.content_title}`);
  });
};

run();

const pseudoRandSuffix = () => Math.random().toString(36).slice(2);
