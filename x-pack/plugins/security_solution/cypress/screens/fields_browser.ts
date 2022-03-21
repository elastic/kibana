/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOSE_BTN = '[data-test-subj="close"]';

export const FIELDS_BROWSER_CONTAINER = '[data-test-subj="fields-browser-container"]';

export const FIELDS_BROWSER_CHECKBOX = (id: string) => {
  return `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-${id}-checkbox"]`;
};

export const FIELDS_BROWSER_FIELDS_COUNT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="fields-count"]`;

export const FIELDS_BROWSER_FILTER_INPUT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-search"]`;

export const FIELDS_BROWSER_HOST_GEO_CITY_NAME_CHECKBOX = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-host.geo.city_name-checkbox"]`;

export const FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER =
  '[data-test-subj="timeline"] [data-test-subj="header-text-host.geo.city_name"]';

export const FIELDS_BROWSER_HOST_GEO_CONTINENT_NAME_CHECKBOX = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-host.geo.continent_name-checkbox"]`;

export const FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER =
  '[data-test-subj="timeline"] [data-test-subj="header-text-host.geo.continent_name"]';

export const FIELDS_BROWSER_MESSAGE_CHECKBOX = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-message-checkbox"]`;

export const FIELDS_BROWSER_MESSAGE_HEADER =
  '[data-test-subj="timeline"] [data-test-subj="header-text-message"]';

export const FIELDS_BROWSER_RESET_FIELDS = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="reset-fields"]`;

export const FIELDS_BROWSER_CATEGORIES_FILTER_BUTTON = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="categories-filter-button"]`;
export const FIELDS_BROWSER_SELECTED_CATEGORY_COUNT = `${FIELDS_BROWSER_CATEGORIES_FILTER_BUTTON} span.euiNotificationBadge`;
export const FIELDS_BROWSER_CATEGORIES_COUNT = `${FIELDS_BROWSER_CATEGORIES_FILTER_BUTTON} span.euiNotificationBadge`;

export const FIELDS_BROWSER_SELECTED_CATEGORIES_BADGES = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="category-badges"]`;
export const FIELDS_BROWSER_CATEGORY_BADGE = (id: string) => {
  return `${FIELDS_BROWSER_SELECTED_CATEGORIES_BADGES} [data-test-subj="category-badge-${id}"]`;
};

export const FIELDS_BROWSER_CATEGORIES_FILTER_CONTAINER =
  '[data-test-subj="categories-selector-container"]';
export const FIELDS_BROWSER_CATEGORIES_FILTER_SEARCH =
  '[data-test-subj="categories-selector-search"]';
export const FIELDS_BROWSER_CATEGORY_FILTER_OPTION = (id: string) => {
  const idAttr = id.replace(/\s/g, '');
  return `${FIELDS_BROWSER_CATEGORIES_FILTER_CONTAINER} [data-test-subj="categories-selector-option-${idAttr}"]`;
};

export const FIELDS_BROWSER_SYSTEM_CATEGORIES_COUNT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="system-category-count"]`;
