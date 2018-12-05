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
            metricAlias: change.setAliases.metricAlias || c.metricAlias,
            logAlias: change.setAliases.logAlias || c.logAlias,
          }
        : c,
    c =>
      change.setFields
        ? {
            ...c,
            fields: {
              container: change.setFields.container || c.fields.container,
              host: change.setFields.host || c.fields.host,
              pod: change.setFields.pod || c.fields.pod,
              tiebreaker: change.setFields.tiebreaker || c.fields.tiebreaker,
              timestamp: change.setFields.timestamp || c.fields.timestamp,
            },
          }
        : c,
  ];
  return updaters.reduce(
    (updatedConfiguration, updater) => updater(updatedConfiguration),
    configuration
  );
};
