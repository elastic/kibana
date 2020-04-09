/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../services/ml_api_service';

import { setUpgradeInProgress } from '../services/upgrade_service';
import { PrivilegesResponse } from '../../../common/types/privileges';

export function getPrivileges(): Promise<PrivilegesResponse> {
  return new Promise((resolve, reject) => {
    ml.checkMlPrivileges()
      .then((resp: PrivilegesResponse) => {
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

export function getManageMlPrivileges(): Promise<PrivilegesResponse> {
  return new Promise((resolve, reject) => {
    ml.checkManageMLPrivileges()
      .then((resp: PrivilegesResponse) => {
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
