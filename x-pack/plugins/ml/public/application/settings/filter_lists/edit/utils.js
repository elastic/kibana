/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isJobIdValid } from '../../../../../common/util/job_utils';

export function isValidFilterListId(id) {
  //  Filter List ID requires the same format as a Job ID, therefore isJobIdValid can be used
  return id !== undefined && id.length > 0 && isJobIdValid(id);
}

// Saves a filter list, running an update if the supplied loadedFilterList, holding the
// original filter list to which edits are being applied, is defined with a filter_id property.
export function saveFilterList(
  toastNotifications,
  mlApi,
  filterId,
  description,
  items,
  loadedFilterList
) {
  return new Promise((resolve, reject) => {
    if (loadedFilterList === undefined || loadedFilterList.filter_id === undefined) {
      // Create a new filter.
      addFilterList(toastNotifications, mlApi, filterId, description, items)
        .then((newFilter) => {
          resolve(newFilter);
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      // Edit to existing filter.
      updateFilterList(mlApi, loadedFilterList, description, items)
        .then((updatedFilter) => {
          resolve(updatedFilter);
        })
        .catch((error) => {
          reject(error);
        });
    }
  });
}

export function addFilterList(toastNotifications, mlApi, filterId, description, items) {
  const filterWithIdExistsErrorMessage = i18n.translate(
    'xpack.ml.settings.filterLists.filterWithIdExistsErrorMessage',
    {
      defaultMessage: 'A filter with id {filterId} already exists',
      values: {
        filterId,
      },
    }
  );

  return new Promise((resolve, reject) => {
    // First check the filterId isn't already in use by loading the current list of filters.
    mlApi.filters
      .filtersStats()
      .then((filterLists) => {
        const savedFilterIds = filterLists.map((filterList) => filterList.filter_id);
        if (savedFilterIds.indexOf(filterId) === -1) {
          // Save the new filter.
          mlApi.filters
            .addFilter(filterId, description, items)
            .then((newFilter) => {
              resolve(newFilter);
            })
            .catch((error) => {
              reject(error);
            });
        } else {
          toastNotifications.addDanger(filterWithIdExistsErrorMessage);
          reject(new Error(filterWithIdExistsErrorMessage));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export function updateFilterList(mlApi, loadedFilterList, description, items) {
  return new Promise((resolve, reject) => {
    // Get items added and removed from loaded filter.
    const loadedItems = loadedFilterList.items;
    const addItems = items.filter((item) => loadedItems.includes(item) === false);
    const removeItems = loadedItems.filter((item) => items.includes(item) === false);

    mlApi.filters
      .updateFilter(loadedFilterList.filter_id, description, addItems, removeItems)
      .then((updatedFilter) => {
        resolve(updatedFilter);
      })
      .catch((error) => {
        reject(error);
      });
  });
}
