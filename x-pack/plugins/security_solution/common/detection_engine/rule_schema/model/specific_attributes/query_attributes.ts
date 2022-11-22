/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { LimitedSizeArray } from '@kbn/securitysolution-io-ts-types';

export const AlertSuppressionGroupBy = LimitedSizeArray({
  codec: t.string,
  minSize: 1,
  maxSize: 3,
});

/**
 * Schema for fields relating to alert suppression, which enables limiting the number of alerts per entity.
 * e.g. group_by: ['host.name'] would create only one alert per value of host.name. The created alert
 * contains metadata about how many other candidate alerts with the same host.name value were suppressed.
 */
export type AlertSuppression = t.TypeOf<typeof AlertSuppression>;
export const AlertSuppression = t.exact(
  t.type({
    group_by: AlertSuppressionGroupBy,
  })
);

export const minimumLicenseForSuppression = 'platinum';
