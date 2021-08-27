/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BreadcrumbTrail } from '../../../shared/kibana_chrome/generate_breadcrumbs';
import { getEngineBreadcrumbs } from '../engine';

import { CURATIONS_TITLE } from './constants';

export const getCurationsBreadcrumbs = (breadcrumbs: BreadcrumbTrail = []) =>
  getEngineBreadcrumbs([CURATIONS_TITLE, ...breadcrumbs]);

// The server API feels us an English datestring, but we want to convert
// it to an actual Date() instance so that we can localize date formats.
export const convertToDate = (serverDateString: string): Date => {
  const readableDateString = serverDateString
    .replace(' at ', ' ')
    .replace('PM', ' PM')
    .replace('AM', ' AM');
  return new Date(readableDateString);
};

export const addDocument = (documentArray: string[], newDocument: string) => {
  return [...documentArray, newDocument];
};

export const removeDocument = (documentArray: string[], deletedDocument: string) => {
  const newArray = [...documentArray];
  const indexToDelete = newArray.indexOf(deletedDocument);
  newArray.splice(indexToDelete, 1);
  return newArray;
};
