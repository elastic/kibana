/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constructOwnerFromFileKind } from '.';

describe('files index', () => {
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
});
