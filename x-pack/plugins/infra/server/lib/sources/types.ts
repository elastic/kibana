/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';
import moment from 'moment';

export const TimestampFromString = new runtimeTypes.Type<number, string>(
  'TimestampFromString',
  (input): input is number => typeof input === 'number',
  (input, context) =>
    runtimeTypes.string.validate(input, context).chain(stringInput => {
      const momentValue = moment(stringInput);
      return momentValue.isValid()
        ? runtimeTypes.success(momentValue.valueOf())
        : runtimeTypes.failure(stringInput, context);
    }),
  output => new Date(output).toISOString()
);

export const InfraSourceConfigurationRuntimeType = runtimeTypes.type({
  name: runtimeTypes.string,
  description: runtimeTypes.string,
  metricAlias: runtimeTypes.string,
  logAlias: runtimeTypes.string,
  fields: runtimeTypes.type({
    container: runtimeTypes.string,
    host: runtimeTypes.string,
    pod: runtimeTypes.string,
    tiebreaker: runtimeTypes.string,
    timestamp: runtimeTypes.string,
  }),
});

export interface InfraSourceConfiguration
  extends runtimeTypes.TypeOf<typeof InfraSourceConfigurationRuntimeType> {}

export const PartialInfraSourceConfigurationRuntimeType = runtimeTypes.partial({
  ...InfraSourceConfigurationRuntimeType.props,
  fields: runtimeTypes.partial(InfraSourceConfigurationRuntimeType.props.fields.props),
});

export interface PartialInfraSourceConfiguration
  extends runtimeTypes.TypeOf<typeof PartialInfraSourceConfigurationRuntimeType> {}

export const InfraSavedSourceConfigurationRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    id: runtimeTypes.string,
    attributes: PartialInfraSourceConfigurationRuntimeType,
  }),
  runtimeTypes.partial({
    version: runtimeTypes.number,
    updated_at: TimestampFromString,
  }),
]);

export interface InfraSavedSourceConfiguration
  extends runtimeTypes.TypeOf<typeof InfraSavedSourceConfigurationRuntimeType> {}
