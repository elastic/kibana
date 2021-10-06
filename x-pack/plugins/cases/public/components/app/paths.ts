/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCasesPath = (basePath = '') => `${basePath}/cases`;
export const getCasesCreatePath = (basePath = '') => `${basePath}/cases/create`;
export const getCasesConfigurePath = (basePath = '') => `${basePath}/cases/configure`;
export const getCasesDetailPath = (basePath = '') => `${basePath}/cases/:detailName`;
export const getCasesSubCaseDetailPath = (basePath = '') =>
  `${getCasesDetailPath(basePath)}/sub-cases/:subCaseId`;
export const getCasesDetailWithCommentPath = (basePath = '') =>
  `${getCasesDetailPath(basePath)}/commentId`;
export const getCasesSubCaseDetailWithCommentPath = (basePath = '') =>
  `${getCasesSubCaseDetailPath(basePath)}/:commentId`;
