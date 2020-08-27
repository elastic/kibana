/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Simulator } from '../test_utilities/simulator';
import { pausifyMock } from '../data_access_layer/mocks/pausify_mock';
import { emptifyMock } from '../data_access_layer/mocks/emptify_mock';
import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import '../test_utilities/extend_jest';

describe('Resolver: data loading and resolution states', () => {
  let simulator: Simulator;
  const resolverComponentInstanceID = 'resolver-loading-resolution-states';

  describe('When entities data is being requested', () => {
    beforeEach(() => {
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
        pause,
      } = pausifyMock(noAncestorsTwoChildren());
      pause(['entities']);
      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display a loading state', async () => {
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

  describe('When resolver tree data is being requested', () => {
    beforeEach(() => {
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
        pause,
      } = pausifyMock(noAncestorsTwoChildren());
      pause(['resolverTree']);
      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display a loading state', async () => {
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

  describe("When the entities request doesn't return any data", () => {
    beforeEach(() => {
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
      } = emptifyMock(noAncestorsTwoChildren(), ['entities']);

      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display an error', async () => {
      await expect(
        simulator.map(() => ({
          resolverGraphLoading: simulator.testSubject('resolver:graph:loading').length,
          resolverGraphError: simulator.testSubject('resolver:graph:error').length,
          resolverGraph: simulator.testSubject('resolver:graph').length,
        }))
      ).toYieldEqualTo({
        resolverGraphLoading: 0,
        resolverGraphError: 1,
        resolverGraph: 0,
      });
    });
  });

  describe("When the resolver tree request doesn't return any data", () => {
    beforeEach(() => {
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
      } = emptifyMock(noAncestorsTwoChildren(), ['resolverTree']);

      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display a resolver graph with 0 nodes', async () => {
      await expect(
        simulator.map(() => ({
          resolverGraphLoading: simulator.testSubject('resolver:graph:loading').length,
          resolverGraphError: simulator.testSubject('resolver:graph:error').length,
          resolverGraph: simulator.testSubject('resolver:graph').length,
          resolverGraphNodes: simulator.testSubject('resolver:node').length,
        }))
      ).toYieldEqualTo({
        resolverGraphLoading: 0,
        resolverGraphError: 0,
        resolverGraph: 1,
        resolverGraphNodes: 0,
      });
    });
  });

  describe('When all resolver data requests successfully resolve', () => {
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
    });

    it('should display the resolver graph with 3 nodes', async () => {
      await expect(
        simulator.map(() => ({
          resolverGraphLoading: simulator.testSubject('resolver:graph:loading').length,
          resolverGraphError: simulator.testSubject('resolver:graph:error').length,
          resolverGraph: simulator.testSubject('resolver:graph').length,
          resolverGraphNodes: simulator.testSubject('resolver:node').length,
        }))
      ).toYieldEqualTo({
        resolverGraphLoading: 0,
        resolverGraphError: 0,
        resolverGraph: 1,
        resolverGraphNodes: 3,
      });
    });
  });
});
