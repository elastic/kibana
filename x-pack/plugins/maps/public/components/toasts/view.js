/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';

export function Toasts({ layerLoadToast, clearLayerLoadToast }) {
  // TODO: Update for layer removal
  if (layerLoadToast === 'error') {
    toastNotifications.addDanger({
      title: 'Error adding layer',
      className: 'mapLayerToast'
    }) && clearLayerLoadToast();
  } else {
    // Do nothing
  }
  return null; // renderless component
}
