/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { ml } from 'plugins/ml/services/ml_api_service';


export async function deleteFilterLists(filterListsToDelete) {
  if (filterListsToDelete === undefined || filterListsToDelete.length === 0) {
    return;
  }

  // Delete each of the specified filter lists in turn, waiting for each response
  // before deleting the next to minimize load on the cluster.
  const messageId = `${(filterListsToDelete.length > 1) ?
    `${filterListsToDelete.length} filter lists` : filterListsToDelete[0].filter_id}`;
  toastNotifications.add(`Deleting ${messageId}`);

  for(const filterList of filterListsToDelete) {
    const filterId = filterList.filter_id;
    try {
      await ml.filters.deleteFilter(filterId);
    } catch (resp) {
      console.log('Error deleting filter list:', resp);
      let errorMessage = `An error occurred deleting filter list ${filterList.filter_id}`;
      if (resp.message) {
        errorMessage += ` : ${resp.message}`;
      }
      toastNotifications.addDanger(errorMessage);
    }
  }

  toastNotifications.addSuccess(`${messageId} deleted`);
}
