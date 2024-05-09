/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const BIDIRECTIONAL_CONNECTOR_TYPES = ['.sentinelone', '.crowdstrike'];
export const isBidirectionalConnectorType = (type: string | undefined) => {
  if (!type) {
    return false;
  }

  return BIDIRECTIONAL_CONNECTOR_TYPES.includes(type);
};
