/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Simulator } from '../test_utilities/simulator';
import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { noResolverDataReturned } from '../data_access_layer/mocks/no_resolver_data_returned';
import '../test_utilities/extend_jest';

describe('Resolver: data loading and resolution states', () => {
  let simulator: Simulator;
  let dbDocumentId: string;
  const resolverComponentInstanceID = 'resolver-loading-state';
  const newTreeId = 'new-tree-id';

  describe('When resolver is loaded with data', () => {
    beforeEach(() => {
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
      } = noAncestorsTwoChildren();

      dbDocumentId = databaseDocumentID;
      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display the resolver graph', async () => {
      await expect(
        simulator.map(() => ({
          resolverGraphLoading: simulator.testSubject('resolver:graph:loading').length,
          resolverGraphError: simulator.testSubject('resolver:graph:error').length,
          resolverGraph: simulator.processResolverGraph(dbDocumentId).length,
        }))
      ).toYieldEqualTo({
        resolverGraphLoading: 0,
        resolverGraphError: 0,
        resolverGraph: 1,
      });
    });
  });

  describe('When resolver data is being requested', () => {
    beforeEach(() => {
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
      } = noAncestorsTwoChildren();

      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display a loading state', async () => {
      // Trigger a loading state by requesting data based on a new DocumentID.
      // There really is no way to do this in the view besides changing the url, so triggering the action instead

      simulator.requestNewTree(newTreeId);
      await expect(
        simulator.map(() => ({
          resolverGraphLoading: simulator.testSubject('resolver:graph:loading').length,
          resolverGraphError: simulator.testSubject('resolver:graph:error').length,
          resolverGraph: simulator.testSubject('resolver:graph').length,
        }))
      ).toYieldEqualTo({
        resolverGraphLoading: 1,
        resolverGraphError: 0,
        resolverGraph: 0,
      });
    });
  });

  describe('When a resolver data request fails', () => {
    beforeEach(() => {
      // We utilize a data access layer that never successfully resolves.
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
      } = noResolverDataReturned();

      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display an error state', async () => {
      await expect(
        simulator.map(() => ({
          resolverGraphLoading: simulator.testSubject('resolver:graph:loading').length,
          resolverGraphError: simulator.testSubject('resolver:graph:error').length,
          resolverGraph: simulator.processResolverGraph(newTreeId).length,
        }))
      ).toYieldEqualTo({
        resolverGraphLoading: 0,
        resolverGraphError: 1,
        resolverGraph: 0,
      });
    });
  });

  describe('When the resolver data requests successfully resolves', () => {
    beforeEach(async () => {
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
      } = noAncestorsTwoChildren();

      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });

      // @ts-ignore
      const result = await dataAccessLayer.resolverTree();

      simulator.requestNewTree(newTreeId);
      simulator.resolveNewTree(result, newTreeId);
    });
    it('should display the resolver graph', async () => {
      // Load a new databaseDocumentID, then explicitly check for that reference in the view
      await expect(
        simulator.map(() => ({
          resolverGraphLoading: simulator.testSubject('resolver:graph:loading').length,
          resolverGraphError: simulator.testSubject('resolver:graph:error').length,
          resolverGraph: simulator.testSubject('resolver:graph').length,
        }))
      ).toYieldEqualTo({
        resolverGraphLoading: 0,
        resolverGraphError: 0,
        resolverGraph: 1,
      });
    });
  });
});
