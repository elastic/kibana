/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Simulator } from '../test_utilities/simulator';
import { nonResolvingRequests } from '../data_access_layer/mocks/non_resolving_requests';
import '../test_utilities/extend_jest';

describe('resolver: when data has been requested', () => {
  let simulator: Simulator;
  const resolverComponentInstanceID = 'resolver-loading-state';
  const pauseOptions = {
    relatedEvents: true,
    resolverTree: true,
    entities: true,
  };

  describe('When data is actively loading', () => {
    let shouldUnpause: () => void;
    beforeEach(() => {
      const rejectOptions = {
        relatedEvents: true,
        resolverTree: true,
        entities: true,
      };
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
        unpause,
      } = nonResolvingRequests(pauseOptions, rejectOptions);

      shouldUnpause = unpause;
      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display a loading state', async () => {
      shouldUnpause(); // Does nothing atm, need to set better control flow to get loading state status

      await expect(
        simulator.map(() => ({
          resolverLoadingWrapper: simulator.testSubject('resolver:graph:loading').length,
        }))
      ).toYieldEqualTo({
        resolverLoadingWrapper: 1,
      });
    });
  });

  describe('When the data request fails', () => {
    let shouldUnpause: () => void;
    beforeEach(() => {
      const rejectOptions = {
        relatedEvents: true,
        resolverTree: true,
        entities: true,
      };
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
        unpause,
      } = nonResolvingRequests(pauseOptions, rejectOptions);

      shouldUnpause = unpause;
      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display an error state', async () => {
      shouldUnpause(); // Does nothing atm, need to set better control flow to get loading state status

      await expect(
        simulator.map(() => ({
          resolverErrorWrapper: simulator.testSubject('resolver:graph:error').length,
        }))
      ).toYieldEqualTo({
        resolverErrorWrapper: 1,
      });
    });
  });

  describe('When the data requests is successfully resolved', () => {
    let shouldUnpause: () => void;
    beforeEach(() => {
      const rejectOptions = {
        relatedEvents: false,
        resolverTree: false,
        entities: false,
      };
      const {
        metadata: { databaseDocumentID },
        dataAccessLayer,
        unpause,
      } = nonResolvingRequests(pauseOptions, rejectOptions);

      shouldUnpause = unpause;
      simulator = new Simulator({
        dataAccessLayer,
        databaseDocumentID,
        resolverComponentInstanceID,
      });
    });

    it('should display the resolver graph', async () => {
      shouldUnpause(); // Does nothing atm, need to set better control flow to get loading state status

      await expect(
        simulator.map(() => ({
          resolverWrapper: simulator.testSubject('resolver:graph').length,
        }))
      ).toYieldEqualTo({
        resolverWrapper: 1,
      });
    });
  });
});
