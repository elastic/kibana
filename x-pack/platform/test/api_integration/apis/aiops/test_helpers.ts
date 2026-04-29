/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAddSignificationItemsActions = (data: any[]) =>
  data.filter((d) => d.type === 'logRateAnalysisResults/addSignificantItems');

export const getHistogramActions = (data: any[]) =>
  data.filter((d) => d.type === 'logRateAnalysisResults/addSignificantItemsHistogram');

export const getGroupActions = (data: any[]) =>
  data.filter((d) => d.type === 'logRateAnalysisResults/addSignificantItemsGroup');

export const getGroupHistogramActions = (data: any[]) =>
  data.filter((d) => d.type === 'logRateAnalysisResults/addSignificantItemsGroupHistogram');

export const getErrorActions = (data: any[]) =>
  data.filter((d) => d.type === 'logRateAnalysisResults/addError');
