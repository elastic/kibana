/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let indexPatternService;
export let timeFilter;

let licenseId;
export const setLicenseId = latestLicenseId => (licenseId = latestLicenseId);
export const getLicenseId = () => {
  return licenseId;
};

let inspector;
export const setInspector = newInspector => (inspector = newInspector);
export const getInspector = () => {
  return inspector;
};

let getInjectedVar;
export const setInjectedVarFunc = getInjectedVarFunc => (getInjectedVar = getInjectedVarFunc);
export const getInjectedVarFunc = () => getInjectedVar;

export const initKibanaServices = ({ injectedMetadata }, { data }) => {
  indexPatternService = data.indexPatterns;
  timeFilter = data.query.timefilter;
};
