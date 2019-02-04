/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from './graphql/types';
import { convertChangeToUpdater } from './source_configuration';

const initialConfiguration: InfraSourceConfiguration = {
  name: 'INITIAL_NAME',
  description: 'INITIAL_DESCRIPTION',
  logAlias: 'INITIAL_LOG_ALIAS',
  metricAlias: 'INITIAL_METRIC_ALIAS',
  fields: {
    container: 'INITIAL_CONTAINER_FIELD',
    host: 'INITIAL_HOST_FIELD',
    pod: 'INITIAL_POD_FIELD',
    tiebreaker: 'INITIAL_TIEBREAKER_FIELD',
    timestamp: 'INITIAL_TIMESTAMP_FIELD',
  },
};

describe('infrastructure source configuration', () => {
  describe('convertChangeToUpdater function', () => {
    it('creates a no-op updater for an empty change', () => {
      const updateConfiguration = convertChangeToUpdater({});

      expect(updateConfiguration(initialConfiguration)).toEqual(initialConfiguration);
    });

    describe('setName operation', () => {
      it('creates a name updater', () => {
        const updateConfiguration = convertChangeToUpdater({
          setName: {
            name: 'CHANGED_NAME',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          name: 'CHANGED_NAME',
        });
      });

      it('creates a name updater even for an empty string', () => {
        const updateConfiguration = convertChangeToUpdater({
          setName: {
            name: '',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          name: '',
        });
      });
    });

    describe('setDescription operation', () => {
      it('creates a description updater', () => {
        const updateConfiguration = convertChangeToUpdater({
          setDescription: {
            description: '',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          description: '',
        });
      });

      it('creates a description updater even for an empty string', () => {
        const updateConfiguration = convertChangeToUpdater({
          setDescription: {
            description: '',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          description: '',
        });
      });
    });

    describe('setAliases operation', () => {
      it('creates a partial alias updater for a partial `setAliases` operation', () => {
        const updateConfiguration = convertChangeToUpdater({
          setAliases: {
            logAlias: 'CHANGED_LOG_ALIAS',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          logAlias: 'CHANGED_LOG_ALIAS',
        });
      });

      it('creates a complete alias updater for a complete `setAliases` operation', () => {
        const updateConfiguration = convertChangeToUpdater({
          setAliases: {
            logAlias: 'CHANGED_LOG_ALIAS',
            metricAlias: 'CHANGED_METRIC_ALIAS',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          logAlias: 'CHANGED_LOG_ALIAS',
          metricAlias: 'CHANGED_METRIC_ALIAS',
        });
      });

      it('creates an alias updater even for empty strings', () => {
        const updateConfiguration = convertChangeToUpdater({
          setAliases: {
            logAlias: '',
            metricAlias: '',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          logAlias: '',
          metricAlias: '',
        });
      });
    });

    describe('setFields operation', () => {
      it('creates a partial field updater for a partial `setFields` operation', () => {
        const updateConfiguration = convertChangeToUpdater({
          setFields: {
            host: 'CHANGED_HOST',
            timestamp: 'CHANGED_TIMESTAMP',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          fields: {
            ...initialConfiguration.fields,
            host: 'CHANGED_HOST',
            timestamp: 'CHANGED_TIMESTAMP',
          },
        });
      });

      it('creates a complete field updater for a complete `setFields` operation', () => {
        const updateConfiguration = convertChangeToUpdater({
          setFields: {
            container: 'CHANGED_CONTAINER',
            host: 'CHANGED_HOST',
            pod: 'CHANGED_POD',
            tiebreaker: 'CHANGED_TIEBREAKER',
            timestamp: 'CHANGED_TIMESTAMP',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          fields: {
            container: 'CHANGED_CONTAINER',
            host: 'CHANGED_HOST',
            pod: 'CHANGED_POD',
            tiebreaker: 'CHANGED_TIEBREAKER',
            timestamp: 'CHANGED_TIMESTAMP',
          },
        });
      });

      it('creates a field updater even for empty strings', () => {
        const updateConfiguration = convertChangeToUpdater({
          setFields: {
            container: '',
            host: '',
            pod: '',
            tiebreaker: '',
            timestamp: '',
          },
        });

        expect(updateConfiguration(initialConfiguration)).toEqual({
          ...initialConfiguration,
          fields: {
            ...initialConfiguration.fields,
            container: '',
            host: '',
            pod: '',
            tiebreaker: '',
            timestamp: '',
          },
        });
      });
    });
  });
});
