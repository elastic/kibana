/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient } from '@kbn/inference-common';
import { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { FieldPatternResultWithChanges } from '@kbn/observability-utils-server/entities/get_log_patterns';
import { RCA_PROMPT_ENTITIES, RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { formatEntity } from '../../util/format_entity';
import { serializeKnowledgeBaseEntries } from '../../util/serialize_knowledge_base_entries';
import { toBlockquote } from '../../util/to_blockquote';
import { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';

const SYSTEM_PROMPT_ADDENDUM = `# Guide: Constructing Keyword Searches to Find Related Entities

When investigating issues like elevated failure rates for a
specific endpoint, you can use the metadata at hand (IP addresses,
URLs, session IDs, tracing IDs, etc.) to build targeted keyword searches.
By extracting meaningful fragments from the data, you can correlate
related services or hosts across distributed systems. Here’s how
you can break down the metadata and format your searches.

## Grouping fields

Define grouping fields for the entities you want to extract. For
instance, "service.name" if you are looking for services, or
"kubernetes.pod.name" if you are looking for pods. Focus
on services, unless you are looking for deployment or
configuration changes.

---

## Key Metadata and Search Format

### Example: Investigating a service failure for \`/api/products\`

You can break down various pieces of metadata into searchable
fragments. For each value, include a short description of its
relationship to the investigation. This value will be used
by the system to determine the relevance of a given entity
that matches the search request.

### 1. **IP Address and Port**
- **Fragments:**
  - \`"10.44.0.11:8080"\`: Full address.
  - \`"10.44.0.11"\`: IP address only.
  - \`"8080"\`: Port number.
- **Appears as:** This IP address and port are referenced as
<ip-field-name> and <port-field-name> in the investigated entity
<entity-name>..

### 2. **Outgoing Request URL**
- **Fragments:**
  - \`"http://called-service/api/product"\`: Full outgoing URL.
  - \`"/api/product*"\`: Endpoint path.
  - \`"called-service"\`: Service name of the upstream dependency.
  - **Appears as:** These URL fragments appear as attributes.request.url
  in the investigated entity <entity-name>. They could appear as referer
  in the upstream dependency.

### 3. **Parent and Span IDs**
  - **Fragments:**
    - \`"000aa"\`: Parent ID.
    - \`"000bbb"\`: Span ID.
  - **Relationship:** These ids appear as span.id and parent.id in the
  investigated entity <entity-name>. They could be referring to spans
  found on upstream or downstream services.

---

## Example Search Format in JSON

To structure your keyword search, format the fragments and their
relationships in a JSON array like this:

\`\`\`json
{
  "groupingFields": [ "service.name" ],
  "values": [
    {
      "fragments": [
        "10.44.0.11:8080",
        "10.44.0.11",
        "8080"
      ],
      "appearsAs": "This IP address and port are referenced as <ip-field-name> and <port-field-name> in the investigated entity <entity-name>."
    },
    {
      "fragments": [
        "http://<upstream-service>/api/product",
        "/api/product",
        "<upstream-service>"
      ],
      "relationship": "These URL fragments appear as attributes.request.url in the investigated entity <entity-name>."
    },
    {
      "fragments": [
        "000aa",
        "000bbb"
      ],
      "relationship": " These ids appear as span.id and parent.id in the investigated entity <entity-name>. They could be referring to spans found on upstream or downstream services"
    }
  ]
}`;

export interface RelatedEntityKeywordSearch {
  fragments: string[];
  appearsAs: string;
}

export async function writeKeywordSearchForRelatedEntities({
  connectorId,
  inferenceClient,
  entity,
  analysis,
  ownPatterns,
  context,
  kbEntries,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  entity: Record<string, string>;
  analysis: TruncatedDocumentAnalysis;
  ownPatterns: FieldPatternResultWithChanges[];
  context: string;
  kbEntries: ScoredKnowledgeBaseEntry[];
}): Promise<{
  groupingFields: string[];
  searches: RelatedEntityKeywordSearch[];
}> {
  const logPatternsPrompt = ownPatterns.length
    ? JSON.stringify(
        ownPatterns.map((pattern) => ({ regex: pattern.regex, sample: pattern.sample }))
      )
    : 'No log patterns found';

  return inferenceClient
    .output({
      id: 'extract_keyword_searches',
      connectorId,
      system: `${RCA_SYSTEM_PROMPT_BASE}

        ${RCA_PROMPT_ENTITIES}`,
      input: `Your current task is to to extract keyword searches
        to find related entities to the entity ${formatEntity(entity)},
        based on the following context:

        ## Investigation context
        ${toBlockquote(context)}

        ${serializeKnowledgeBaseEntries(kbEntries)}

        ## Data analysis
        ${JSON.stringify(analysis)}

        ## Log patterns 
        
        ${logPatternsPrompt}

        ## Instructions
        ${SYSTEM_PROMPT_ADDENDUM}`,
      schema: {
        type: 'object',
        properties: {
          groupingFields: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          searches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fragments: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                appearsAs: {
                  type: 'string',
                  description:
                    'Describe in what fields these values appear as in the investigated entity. You can mention multiple fields if applicable',
                },
              },
              required: ['fragments', 'appearsAs'],
            },
          },
        },
        required: ['searches', 'groupingFields'],
      } as const,
    })
    .then((event) => event.output);
}
