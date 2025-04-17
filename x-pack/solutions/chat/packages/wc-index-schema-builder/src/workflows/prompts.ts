/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessageLike } from '@langchain/core/messages';
import type { IndexSourceDefinition } from '@kbn/wci-common';
import { type IndexInformation, type SampleDocument } from '../utils';

export const generateDescriptionPrompt = ({
  indexName,
  indexInfo,
  sampleDocuments,
  sourceDefinition,
}: {
  indexName: string;
  indexInfo: IndexInformation;
  sampleDocuments: SampleDocument[];
  sourceDefinition: Partial<IndexSourceDefinition>;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an helpful AI assistant, with expert knowledge of Elasticsearch and the Elastic stack.
     Your current job is to generate schemas to describe Elasticsearch indices, following a predefined format.
  `,
    ],
    [
      'human',
      `
  ## Task description

  You are building a schema representing a tool that can be used by an LLM to query an Elasticsearch index.
  You previously generated the information about which field should be used for full text search (query fields),
  and which ones should be used for filtering (filter fields).

  Your current task is to generate a description for the tool. The description will be used for the LLM
  to know what the tool can be used for.

  - Please keep the description relatively short - ideally not more than a few lines
  - Describe *what the tool can be used to query*, not the index

  E.g

  "This tool can be used to query the [logs] index, which contains log entries from a web application.
   most of the logs are access logs from NGInx."

  ### Base information:

  - index name: ${indexName}

  ### Tool definition:

  ${JSON.stringify(sourceDefinition)}

  ### Mappings:

  ${JSON.stringify(indexInfo.mappings)}

  ### Sample documents:

  ${JSON.stringify(sampleDocuments)}

  `,
    ],
  ];
};

export const pickFilterFieldsPrompt = ({
  indexName,
  indexInfo,
  sampleDocuments,
  fieldTopValues,
  maxFilters = 5,
}: {
  indexName: string;
  indexInfo: IndexInformation;
  sampleDocuments: SampleDocument[];
  fieldTopValues: Record<string, string[]>;
  maxFilters?: number;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an helpful AI assistant, with expert knowledge of Elasticsearch and the Elastic stack.
     Your current job is to generate schemas to describe Elasticsearch indices, following a predefined format.
  `,
    ],
    [
      'human',
      `

  ## Task description

  We want to generate a search schema for the index ${indexName}. For that purpose,
  we want to select the fields will be defined as "filters" in the schema.

  "Filter" fields are basically fields that the user will be able to use in the UI to create search filter.
  E.g. if the "category" field is a filter, then the user will be able to search for "category: CAT".

  ## Additional directives

  - "meta" fields that don't represent anything concrete are irrelevant, and shouldn't be picked
    - e.g 'inference_id' or '_run_inference'

  - please pick no more than *${maxFilters}* fields.

  ## Index information

  Here are some information to help you in your decision:

  ### Base information:

  - index name: ${indexName}

  ### Mappings:

  ${JSON.stringify(indexInfo.mappings)}

  ### Sample documents:

  ${JSON.stringify(sampleDocuments)}

  ### Fields top values:

  ${Object.entries(fieldTopValues)
    .map(([key, values]) => {
      return `- field ${key}: ${values.join(', ')}`;
    })
    .join('\n')}

  Given the previous information, please list the fields that you think would make the most sense to be used as filter.
  `,
    ],
  ];
};

export const generateFilterPrompt = ({
  indexName,
  fieldName,
  fieldType,
  sampleDocuments,
  fieldTopValues,
}: {
  indexName: string;
  fieldName: string;
  fieldType: string;

  sampleDocuments: SampleDocument[];
  fieldTopValues?: string[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an helpful AI assistant, with expert knowledge of Elasticsearch and the Elastic stack.
     Your current job is to generate schemas to describe Elasticsearch indices, following a predefined format.
  `,
    ],
    [
      'human',
      `

  ## Task description

  We previously selected a list of fields from the index's mappings that will be used as filter in the schema.

  "Filter" fields are basically fields that the user will be able to use in the UI to create search filter.
  E.g. if the "category" field is a filter, then the user will be able to search for "category: CAT".

  We now want to generate the full filter definition for the "${fieldName}" field, which is of type "${fieldType}".

  The filter definition is composed of:
  - description: (string) a short description for what the field/filter can be used for
  - asEnum: (boolean) if true, the filter will behave as an enum: the field's top values will be fetched at query time and
            listed in the description, and using the filter will be limited to doing it against those values.

  ## Additional directives

  - 'asEnum' can only be true if the field type is 'keyword' or 'boolean'

  ## Context information

  Here are some information to help you in your decision:

  ### Base information:

  - index name: ${indexName}
  - filter field name: ${fieldName}
  - filter field type: ${fieldType}

  ### Sample documents:

  ${JSON.stringify(sampleDocuments)}

  ### Fields top values:

  ${fieldTopValues?.map((value) => `- ${value}`).join('\n') ?? 'No top values for that field type'}

  Given the previous information, generate the filter definition.
  `,
    ],
  ];
};

export const pickQueryFieldsPrompt = ({
  indexName,
  indexInfo,
  sampleDocuments,
  maxFields = 2,
}: {
  indexName: string;
  indexInfo: IndexInformation;
  sampleDocuments: SampleDocument[];
  maxFields?: number;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an helpful AI assistant, with expert knowledge of Elasticsearch and the Elastic stack.
     Your current job is to generate schemas to describe Elasticsearch indices, following a predefined format.
  `,
    ],
    [
      'human',
      `

  ## Task description

  We want to generate a search schema for the index ${indexName}. For that purpose,
  we want to select the fields will be defined as "fulltext search" fields in the schema.

  "fulltext search" fields are fields that text queries will be performed against.
  E.g. when the user search for "red balloon CATEGORY:RED", we will perform a text search for "red balloon" against the fields
  defined as "fulltext search" field in the schema.

  ## Additional directives

  - fulltext search fields can only be of type 'text' or 'semantic_text'
  - only includes the fields that are the most likely to contains "content" text
  - please pick no more than *${maxFields}* fields.

  ## Index information

  Here are some information to help you in your decision:

  ### Base information:

  - index name: ${indexName}

  ### Mappings:

  ${JSON.stringify(indexInfo.mappings)}

  ### Sample documents:

  ${JSON.stringify(sampleDocuments)}

  Given the previous information, please list the fields that you think would make the most sense to be used as full text fields.
  `,
    ],
  ];
};

export const pickContentFieldsPrompt = ({
  indexName,
  indexInfo,
  sampleDocuments,
  maxFields = 10,
}: {
  indexName: string;
  indexInfo: IndexInformation;
  sampleDocuments: SampleDocument[];
  maxFields?: number;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an helpful AI assistant, with expert knowledge of Elasticsearch and the Elastic stack.
     Your current job is to generate schemas to describe Elasticsearch indices, following a predefined format.
  `,
    ],
    [
      'human',
      `

  ## Task description

  We want to generate a schema for a tool that will then be used by a LLM to query the index ${indexName}. For that purpose,
  you current task is to define the "content" fields, fields that will be returned by the tool as content for the LLM to use.

  ## Additional directives

  - do not include "meta" fields such as _inference_id or similar without real value
  - please pick the fields that you think would be the most useful for the
  - please pick no more than *${maxFields}* fields.

  ## Index information

  Here are some information to help you in your decision:

  ### Base information:

  - index name: ${indexName}

  ### Mappings:

  ${JSON.stringify(indexInfo.mappings)}

  ### Sample documents:

  ${JSON.stringify(sampleDocuments)}

  Given the previous information, please list the fields that you think would make the most sense to be used as content fields.
  `,
    ],
  ];
};
