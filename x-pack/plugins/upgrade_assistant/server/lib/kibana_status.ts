/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationsClient } from '@kbn/core/server';
import { DomainDeprecationDetails } from '@kbn/core/server/types';

export const getKibanaUpgradeStatus = async (deprecationsClient: DeprecationsClient) => {
  const kibanaDeprecations: DomainDeprecationDetails[] =
    await deprecationsClient.getAllDeprecations();

  const totalCriticalDeprecations = kibanaDeprecations.filter((d) => d.level === 'critical').length;

  return {
    totalCriticalDeprecations,
  };
};
