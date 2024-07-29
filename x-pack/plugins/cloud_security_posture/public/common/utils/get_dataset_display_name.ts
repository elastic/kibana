/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Dataset = 'wiz.cloud_configuration_finding' | 'cloud_security_posture.findings';

export const WIZ_DATASET = 'wiz.cloud_configuration_finding';
export const CSP_DATASET = 'cloud_security_posture.findings';

const datasetDisplayNames: { [key: Dataset]: string } = {
  [WIZ_DATASET]: 'Wiz',
  [CSP_DATASET]: 'Elastic CSP',
};

export const getDatasetDisplayName = (dataset: Dataset | srting) => datasetDisplayNames[dataset];
