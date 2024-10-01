/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CSP_MISCONFIGURATIONS_DATASET,
  CSP_VULN_DATASET,
  getDatasetDisplayName,
  WIZ_MISCONFIGURATIONS_DATASET,
  WIZ_VULN_DATASET,
} from './get_dataset_display_name';

describe('getDatasetDisplayName', () => {
  it('should return "Wiz" when dataset is from Wiz integration', () => {
    const wizMisconfigsDatasetDisplayName = getDatasetDisplayName(WIZ_MISCONFIGURATIONS_DATASET);
    expect(wizMisconfigsDatasetDisplayName).toBe('Wiz');
    const wizVulnDatasetDisplayName = getDatasetDisplayName(WIZ_VULN_DATASET);
    expect(wizVulnDatasetDisplayName).toBe('Wiz');
  });

  it('should return "Elastic CSP" when dataset is from Elastic CSP integration', () => {
    const elasticCspMisconfigsDatasetDisplayName = getDatasetDisplayName(
      CSP_MISCONFIGURATIONS_DATASET
    );
    expect(elasticCspMisconfigsDatasetDisplayName).toBe('Elastic CSP');
    const elasticCspVulnDatasetDisplayName = getDatasetDisplayName(CSP_VULN_DATASET);
    expect(elasticCspVulnDatasetDisplayName).toBe('Elastic CSP');
  });

  it('should return undefined when dataset is undefined', () => {
    const result = getDatasetDisplayName(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined when dataset is an empty string', () => {
    const result = getDatasetDisplayName('');
    expect(result).toBeUndefined();
  });
});
