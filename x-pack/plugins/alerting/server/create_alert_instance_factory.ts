/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';

export function createAlertInstanceFactory(alertInstancesData: Record<string, any>) {
  for (const alertInstanceId of Object.keys(alertInstancesData)) {
    alertInstancesData[alertInstanceId] = new AlertInstance(alertInstancesData[alertInstanceId]);
  }
  return (id: string): AlertInstance => {
    if (!alertInstancesData[id]) {
      alertInstancesData[id] = new AlertInstance();
    }

    return alertInstancesData[id];
  };
}
