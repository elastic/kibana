/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ml } from '../services/ml_api_service';

import { setUpgradeInProgress } from '../services/upgrade_service';
import { MlCapabilitiesResponse } from '../../../common/types/capabilities';

export function getCapabilities(): Promise<MlCapabilitiesResponse> {
  return new Promise((resolve, reject) => {
    ml.checkMlCapabilities()
      .then((resp: MlCapabilitiesResponse) => {
        if (resp.upgradeInProgress === true) {
          setUpgradeInProgress(true);
        }
        resolve(resp);
      })
      .catch(() => {
        reject();
      });
  });
}
