/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Dataset = 'wiz.cloud_configuration_finding' | 'cloud_security_posture.findings';

export const getDatasetDisplayName = (dataset: Dataset) => {
  if (dataset === 'wiz.cloud_configuration_finding') return 'Wiz';
  if (dataset === 'cloud_security_posture.findings') return 'Elastic CSP';
};
