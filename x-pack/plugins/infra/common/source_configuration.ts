/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration, UpdateSourceInput } from './graphql/types';

export const convertChangeToUpdater = (change: UpdateSourceInput) => <
  C extends InfraSourceConfiguration
>(
  configuration: C
): C => {
  const updaters: Array<(c: C) => C> = [
    c => (change.setName ? Object.assign({}, c, { name: change.setName.name }) : c),
    c =>
      change.setDescription
        ? Object.assign({}, c, { description: change.setDescription.description })
        : c,
    c =>
      change.setAliases
        ? Object.assign({}, c, {
            metricAlias: defaultTo(c.metricAlias, change.setAliases.metricAlias),
            logAlias: defaultTo(c.logAlias, change.setAliases.logAlias),
          })
        : c,
    c =>
      change.setFields
        ? Object.assign({}, c, {
            fields: {
              container: defaultTo(c.fields.container, change.setFields.container),
              host: defaultTo(c.fields.host, change.setFields.host),
              message: c.fields.message,
              pod: defaultTo(c.fields.pod, change.setFields.pod),
              tiebreaker: defaultTo(c.fields.tiebreaker, change.setFields.tiebreaker),
              timestamp: defaultTo(c.fields.timestamp, change.setFields.timestamp),
            },
          })
        : c,
  ];
  return updaters.reduce(
    (updatedConfiguration, updater) => updater(updatedConfiguration),
    configuration
  );
};

const defaultTo = <T>(defaultValue: T, maybeValue: T | undefined | null): T =>
  typeof maybeValue === 'undefined' || maybeValue === null ? defaultValue : maybeValue;
