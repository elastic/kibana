/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseFileMetadataForDeletionRt,
  constructFileKindIdByOwner,
  constructFilesHttpOperationTag,
  constructOwnerFromFileKind,
} from '.';
import { APP_ID, OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../constants';
import { HttpApiTagOperation } from '../constants/types';

describe('files index', () => {
  describe('constructFilesHttpOperationTag', () => {
    it.each([
      [SECURITY_SOLUTION_OWNER, HttpApiTagOperation.Read, 'securitySolutionFilesCasesRead'],
      [OBSERVABILITY_OWNER, HttpApiTagOperation.Create, 'observabilityFilesCasesCreate'],
      [APP_ID, HttpApiTagOperation.Delete, 'casesFilesCasesDelete'],
    ])('builds the tag for owner: %p operation: %p tag: %p', (owner, operation, tag) => {
      expect(constructFilesHttpOperationTag(owner, operation)).toEqual(tag);
    });
  });

  describe('constructFileKindIdByOwner', () => {
    it.each([
      [SECURITY_SOLUTION_OWNER, 'securitySolutionFilesCases'],
      [OBSERVABILITY_OWNER, 'observabilityFilesCases'],
      [APP_ID, 'casesFilesCases'],
    ])('builds the right file kind for owner: %p file kind: %p', (owner, fileKind) => {
      expect(constructFileKindIdByOwner(owner)).toEqual(fileKind);
    });
  });

  describe('constructOwnerFromFileKind', () => {
    it('returns undefined when the delimiter cannot be found with an empty string', () => {
      expect(constructOwnerFromFileKind('')).toBeUndefined();
    });

    it('returns undefined when the delimiter cannot be found in a non-empty string', () => {
      expect(constructOwnerFromFileKind('abc')).toBeUndefined();
    });

    it('returns undefined when the extract owner is not part of the valid owners array', () => {
      expect(constructOwnerFromFileKind('abcFilesCases')).toBeUndefined();
    });

    it('returns undefined when there is a string after the delimiter', () => {
      expect(constructOwnerFromFileKind('securitySolutionFilesCasesAbc')).toBeUndefined();
    });

    it('returns securitySolution when given the security solution file kind', () => {
      expect(constructOwnerFromFileKind('securitySolutionFilesCases')).toEqual('securitySolution');
    });

    it('returns observability when given the observability file kind', () => {
      expect(constructOwnerFromFileKind('observabilityFilesCases')).toEqual('observability');
    });

    it('returns cases when given the cases file kind', () => {
      expect(constructOwnerFromFileKind('casesFilesCases')).toEqual('cases');
    });
  });

  describe('CaseFileMetadataForDeletionRt', () => {
    const defaultRequest = {
      caseIds: ['case-id-1', 'case-id-2'],
    };

    it('has expected attributes in request', () => {
      const query = CaseFileMetadataForDeletionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseFileMetadataForDeletionRt.decode({
        caseIds: ['case-id-1', 'case-id-2'],
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
