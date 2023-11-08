/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedHits } from './get_flattened_hits';
import { mockMsearchResponse } from '../../../../__mocks__/msearch_response';
import type { MsearchResponse } from './types';

describe('getFlattenedHits', () => {
  it('returns an empty array when the response is undefined', () => {
    const result = getFlattenedHits(undefined);

    expect(result).toEqual([]);
  });

  it('returns an empty array when hits > hits is empty', () => {
    const result = getFlattenedHits({ hits: { hits: [] } });

    expect(result).toEqual([]);
  });

  it('returns the expected flattened hits given a non-empty `MsearchResponse`', () => {
    const expected = [
      {
        pageContent:
          "[[esql-from]]\n=== `FROM`\n\nThe `FROM` source command returns a table with up to 10,000 documents from a\ndata stream, index, or alias. Each row in the resulting table represents a\ndocument. Each column corresponds to a field, and can be accessed by the name\nof that field.\n\n[source,esql]\n----\nFROM employees\n----\n\nYou can use <<api-date-math-index-names,date math>> to refer to indices, aliases\nand data streams. This can be useful for time series data, for example to access\ntoday's index:\n\n[source,esql]\n----\nFROM <logs-{now/d}>\n----\n\nUse comma-separated lists or wildcards to query multiple data streams, indices,\nor aliases:\n\n[source,esql]\n----\nFROM employees-00001,employees-*\n----\n",
        metadata: {
          source:
            '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/documentation/source_commands/from.asciidoc',
        },
      },
    ];

    const result = getFlattenedHits(mockMsearchResponse.responses[0] as MsearchResponse);

    expect(result).toEqual(expected);
  });

  it('returns an array of FlattenedHits with empty strings when given an MsearchResponse with missing fields', () => {
    const msearchResponse = {
      hits: {
        hits: [
          {
            _source: {
              metadata: {
                source: '/source/1',
              },
            },
          },
          {
            _source: {
              text: 'Source 2 text',
            },
          },
        ],
      },
    };

    const expected = [
      {
        pageContent: '', // <-- missing text field
        metadata: {
          source: '/source/1',
        },
      },
      {
        pageContent: 'Source 2 text',
        metadata: {
          source: '', // <-- missing source field
        },
      },
    ];

    const result = getFlattenedHits(msearchResponse);

    expect(result).toEqual(expected);
  });
});
