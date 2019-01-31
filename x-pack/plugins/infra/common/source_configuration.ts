/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration, UpdateSourceInput } from './graphql/types';

export const convertChangeToUpdater = (change: UpdateSourceInput) => (
  configuration: InfraSourceConfiguration
): InfraSourceConfiguration => {
  const updaters: Array<(c: InfraSourceConfiguration) => InfraSourceConfiguration> = [
    c => (change.setName ? { ...c, name: change.setName.name } : c),
    c => (change.setDescription ? { ...c, description: change.setDescription.description } : c),
    c =>
      change.setAliases
        ? {
            ...c,
            metricAlias: defaultTo(c.metricAlias, change.setAliases.metricAlias),
            logAlias: defaultTo(c.logAlias, change.setAliases.logAlias),
          }
        : c,
    c =>
      change.setFields
        ? {
            ...c,
            fields: {
              container: defaultTo(c.fields.container, change.setFields.container),
              host: defaultTo(c.fields.host, change.setFields.host),
              pod: defaultTo(c.fields.pod, change.setFields.pod),
              tiebreaker: defaultTo(c.fields.tiebreaker, change.setFields.tiebreaker),
              timestamp: defaultTo(c.fields.timestamp, change.setFields.timestamp),
            },
          }
        : c,
  ];
  return updaters.reduce(
    (updatedConfiguration, updater) => updater(updatedConfiguration),
    configuration
  );
};

const defaultTo = <T>(defaultValue: T, maybeValue: T | undefined | null): T =>
  typeof maybeValue === 'undefined' || maybeValue === null ? defaultValue : maybeValue;
