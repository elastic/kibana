/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asKQL } from './kql_encoder';
import { Workspace, WorkspaceNode } from '../types';

describe('kql_encoder', () => {
  let workspaceMock: jest.Mocked<Workspace>;

  beforeEach(() => {
    workspaceMock = ({
      returnUnpackedGroupeds: (nodes: []) => nodes,
      getSelectedOrAllNodes: jest.fn(() => [
        {
          data: {
            field: 'fieldA',
            term: 'term1',
          },
        },
        {
          data: {
            field: 'fieldA',
            term: 'term2',
          },
        },
        {
          data: {
            field: 'fieldB',
            term: 'term1',
          },
        },
      ]),
    } as unknown) as jest.Mocked<Workspace>;
  });

  it('should encode query as URI component', () => {
    expect(asKQL(workspaceMock, 'and')).toEqual(
      "'%22fieldA%22%20%3A%20%22term1%22%20and%20%22fieldA%22%20%3A%20%22term2%22%20and%20%22fieldB%22%20%3A%20%22term1%22'"
    );
  });

  it('should encode nodes as or query', () => {
    expect(decodeURIComponent(asKQL(workspaceMock, 'or'))).toEqual(
      `'"fieldA" : "term1" or "fieldA" : "term2" or "fieldB" : "term1"'`
    );
  });

  it('should encode nodes as and query', () => {
    expect(decodeURIComponent(asKQL(workspaceMock, 'and'))).toEqual(
      `'"fieldA" : "term1" and "fieldA" : "term2" and "fieldB" : "term1"'`
    );
  });

  it('should escape quotes in field names', () => {
    workspaceMock.getSelectedOrAllNodes.mockReturnValue([
      {
        data: {
          field: 'a"b',
          term: 'term1',
        },
      } as WorkspaceNode,
    ]);
    expect(decodeURIComponent(asKQL(workspaceMock, 'and'))).toEqual(`'"a\\"b" : "term1"'`);
  });

  it('should escape quotes in terms', () => {
    workspaceMock.getSelectedOrAllNodes.mockReturnValue([
      {
        data: {
          field: 'fieldA',
          term: 'term"1',
        },
      } as WorkspaceNode,
    ]);
    expect(decodeURIComponent(asKQL(workspaceMock, 'and'))).toEqual(`'"fieldA" : "term\\"1"'`);
  });
});
