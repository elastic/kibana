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

