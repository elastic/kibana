/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SourceDataItem } from '../types';

export const hasMultipleConnectorOptions = ({
  internalConnectorAvailable,
  externalConnectorAvailable,
  customConnectorAvailable,
}: SourceDataItem) =>
  [externalConnectorAvailable, internalConnectorAvailable, customConnectorAvailable].filter(
    (available) => !!available
  ).length > 1;
