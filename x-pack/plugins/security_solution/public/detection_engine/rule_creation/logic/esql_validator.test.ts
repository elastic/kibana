/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { parseEsqlQuery, computeHasMetadataOperator } from './esql_validator';

import { isAggregatingQuery } from '@kbn/securitysolution-utils';

jest.mock('@kbn/securitysolution-utils', () => ({ isAggregatingQuery: jest.fn() }));

const isAggregatingQueryMock = isAggregatingQuery as jest.Mock;

const getQeryAst = (query: string) => {
  const { ast } = getAstAndSyntaxErrors(query);
  return ast;
};

describe('computeHasMetadataOperator', () => {
  it('should be false if query does not have operator', () => {
    expect(computeHasMetadataOperator(getQeryAst('from test*'))).toBe(false);
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata'))).toBe(false);
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata id'))).toBe(false);
    expect(computeHasMetadataOperator(getQeryAst('from metadata*'))).toBe(false);
    expect(computeHasMetadataOperator(getQeryAst('from test* | keep metadata'))).toBe(false);
    expect(computeHasMetadataOperator(getQeryAst('from test* | eval x="metadata _id"'))).toBe(
      false
    );
  });
  it('should be true if query has operator', () => {
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata _id'))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata _id, _index'))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata _index, _id'))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test*  metadata _id '))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test*  metadata _id | limit 10'))).toBe(
      true
    );
    expect(
      computeHasMetadataOperator(
        getQeryAst(`from packetbeat* metadata

        _id
        | limit 100`)
      )
    ).toBe(true);

    // still validates deprecated square bracket syntax
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata _id'))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata _id, _index'))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test* metadata _index, _id'))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test*  metadata _id '))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test*    metadata _id '))).toBe(true);
    expect(computeHasMetadataOperator(getQeryAst('from test*  metadata _id | limit 10'))).toBe(
      true
    );
    expect(
      computeHasMetadataOperator(
        getQeryAst(`from packetbeat* metadata

        _id
        | limit 100`)
      )
    ).toBe(true);
  });
});

describe('parseEsqlQuery', () => {
  it('returns isMissingMetadataOperator true when query is not aggregating and does not have metadata operator', () => {
    isAggregatingQueryMock.mockReturnValueOnce(false);

    expect(parseEsqlQuery('from test*')).toEqual({
      errors: [],
      isEsqlQueryAggregating: false,
      isMissingMetadataOperator: true,
    });
  });

  it('returns isMissingMetadataOperator false when query is not aggregating and has metadata operator', () => {
    isAggregatingQueryMock.mockReturnValueOnce(false);

    expect(parseEsqlQuery('from test* metadata _id')).toEqual({
      errors: [],
      isEsqlQueryAggregating: false,
      isMissingMetadataOperator: false,
    });
  });

  it('returns isMissingMetadataOperator false when query is aggregating', () => {
    isAggregatingQueryMock.mockReturnValue(true);

    expect(parseEsqlQuery('from test*')).toEqual({
      errors: [],
      isEsqlQueryAggregating: true,
      isMissingMetadataOperator: false,
    });

    expect(parseEsqlQuery('from test* metadata _id')).toEqual({
      errors: [],
      isEsqlQueryAggregating: true,
      isMissingMetadataOperator: false,
    });
  });

  it('returns error when query is syntactically invalid', () => {
    isAggregatingQueryMock.mockReturnValueOnce(false);

    expect(parseEsqlQuery('aaa bbbb ssdasd')).toEqual({
      errors: expect.arrayContaining([
        expect.objectContaining({
          message:
            "SyntaxError: mismatched input 'aaa' expecting {'explain', 'from', 'row', 'show'}",
        }),
      ]),
      isEsqlQueryAggregating: false,
      isMissingMetadataOperator: true,
    });
  });
});
