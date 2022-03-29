/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExperimentalFeaturesService } from './experimental_features_service';
import { getIsExperimentalFeatureEnabled } from './get_experimental_features';

describe('getIsExperimentalFeatureEnabled', () => {
  it('getIsExperimentalFeatureEnabled returns the flag enablement', async () => {
    ExperimentalFeaturesService.init({
      experimentalFeatures: {
        rulesListDatagrid: true,
        internalAlertsTable: true,
        rulesDetailLogs: true,
      },
    });

    let result = getIsExperimentalFeatureEnabled('rulesListDatagrid');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('rulesDetailLogs');

    expect(result).toEqual(true);

    result = getIsExperimentalFeatureEnabled('internalAlertsTable');

    expect(result).toEqual(true);

    expect(() => getIsExperimentalFeatureEnabled('doesNotExist' as any)).toThrowError(
      'Invalid enable value doesNotExist. Allowed values are: rulesListDatagrid, rulesDetailLogs'
    );
  });
});
