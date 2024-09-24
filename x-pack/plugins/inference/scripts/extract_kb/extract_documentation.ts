/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

/** the list of fields to import from the source cluster */
const fields = [
  'content_title',
  'content_body',
  'product_name', // "Kibana", "Elasticsearch"
  'category', // "documentation"
  'slug',
  'url',
  'version',
  'ai_fields.ai_subtitle',
  'ai_fields.ai_summary',
  'ai_fields.ai_questions_answered',
  'ai_fields.ai_tags',
];

export interface ExtractedDocument {
  content_title: string;
  content_body: string;
  product_name: string;
  root_type: string;
  slug: string;
  url: string;
  version: string;
  ai_subtitle: string;
  ai_summary: string;
  ai_questions_answered: string[];
  ai_tags: string[];
}

const convertHit = (hit: SearchHit<any>): ExtractedDocument => {
  const source = hit._source;
  return {
    content_title: source.content_title,
    content_body: source.content_body,
    product_name: source.product_name,
    root_type: 'documentation',
    slug: source.slug,
    url: source.url,
    version: source.version,
    ai_subtitle: source.ai_fields.ai_subtitle,
    ai_summary: source.ai_fields.ai_summary,
    ai_questions_answered: source.ai_fields.ai_questions_answered,
    ai_tags: source.ai_fields.ai_tags,
  };
};

export const extractDocumentation = async ({
  client,
  index,
  stackVersion,
  productName,
}: {
  client: Client;
  index: string;
  stackVersion: string;
  productName: string;
}) => {
  const response = await client.search({
    index,
    size: 10000,
    query: {
      bool: {
        must: [
          { term: { product_name: productName } },
          { term: { version: stackVersion } },
          { exists: { field: 'ai_fields.ai_summary' } },
        ],
      },
    },
    fields,
  });

  return response.hits.hits.map(convertHit);
};
