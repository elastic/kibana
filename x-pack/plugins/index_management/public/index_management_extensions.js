/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const summaryExtensions = [];
export const addSummaryExtension = (summaryExtension)=> {
  summaryExtensions.push(summaryExtension);
};
export const getSummaryExtensions = () => {
  return summaryExtensions;
};
const actionExtensions = [];
export const addActionExtension = (actionExtension)=> {
  actionExtensions.push(actionExtension);
};
export const getActionExtensions = () => {
  return actionExtensions;
};
const bannerExtensions = [];
export const addBannerExtension = (actionExtension)=> {
  bannerExtensions.push(actionExtension);
};
export const getBannerExtensions = () => {
  return bannerExtensions;
};
const filterExtensions = [];
export const addFilterExtension = (filterExtension)=> {
  filterExtensions.push(filterExtension);
};
export const getFilterExtensions = () => {
  return filterExtensions;
};
const toggleExtensions = [];
export const addToggleExtension = (toggleExtension)=> {
  toggleExtensions.push(toggleExtension);
};
export const getToggleExtensions = () => {
  return toggleExtensions;
};
const badgeExtensions = [];
export const addBadgeExtension = (badgeExtension)=> {
  badgeExtensions.push(badgeExtension);
};
export const getBadgeExtensions = () => {
  return badgeExtensions;
};


