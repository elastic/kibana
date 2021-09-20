/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOSE_BTN = '[data-test-subj="close"]';

export const FIELDS_BROWSER_CATEGORIES_COUNT = '[data-test-subj="categories-count"]';

export const FIELDS_BROWSER_CHECKBOX = (id: string) => {
  return `[data-test-subj="category-table-container"] [data-test-subj="field-${id}-checkbox"]`;
};

export const FIELDS_BROWSER_CONTAINER = '[data-test-subj="fields-browser-container"]';

export const FIELDS_BROWSER_DRAGGABLE_HOST_GEO_COUNTRY_NAME_HEADER = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-name-host.geo.country_name"]`;

export const FIELDS_BROWSER_FIELDS_COUNT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="fields-count"]`;

export const FIELDS_BROWSER_FILTER_INPUT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-search"]`;

export const FIELDS_BROWSER_HEADER_DROP_AREA = '[data-test-subj="headers-group"]';

export const FIELDS_BROWSER_HOST_CATEGORIES_COUNT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="host-category-count"]`;

export const FIELDS_BROWSER_HOST_GEO_CITY_NAME_CHECKBOX = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-host.geo.city_name-checkbox"]`;

export const FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER =
  '[data-test-subj="timeline"] [data-test-subj="header-text-host.geo.city_name"]';

export const FIELDS_BROWSER_HOST_GEO_CONTINENT_NAME_CHECKBOX = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-host.geo.continent_name-checkbox"]`;

export const FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER =
  '[data-test-subj="timeline"] [data-test-subj="header-text-host.geo.continent_name"]';

export const FIELDS_BROWSER_HOST_GEO_COUNTRY_NAME_CHECKBOX = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-host.geo.country_name-checkbox"]`;

export const FIELDS_BROWSER_HOST_GEO_COUNTRY_NAME_HEADER =
  '[data-test-subj="timeline"] [data-test-subj="header-text-host.geo.country_name"]';

export const FIELDS_BROWSER_MESSAGE_CHECKBOX = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-message-checkbox"]`;

export const FIELDS_BROWSER_MESSAGE_HEADER =
  '[data-test-subj="timeline"] [data-test-subj="header-text-message"]';

export const FIELDS_BROWSER_RESET_FIELDS = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="reset-fields"]`;

export const FIELDS_BROWSER_TITLE = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-browser-title"]`;

export const FIELDS_BROWSER_SELECTED_CATEGORY_COUNT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="selected-category-count-badge"]`;

export const FIELDS_BROWSER_SELECTED_CATEGORY_TITLE = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="selected-category-title"]`;

export const FIELDS_BROWSER_SYSTEM_CATEGORIES_COUNT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="system-category-count"]`;
