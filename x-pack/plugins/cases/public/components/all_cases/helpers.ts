/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash/fp';
import { AssociationType, CaseStatuses, CaseType } from '../../../common';
import { Case, SubCase } from '../../containers/types';
import { statuses } from '../status';

export const isSelectedCasesIncludeCollections = (selectedCases: Case[]) =>
  selectedCases.length > 0 &&
  selectedCases.some((caseObj: Case) => caseObj.type === CaseType.collection);

export const isSubCase = (theCase: Case | SubCase): theCase is SubCase =>
  (theCase as SubCase).caseParentId !== undefined &&
  (theCase as SubCase).associationType === AssociationType.subCase;

export const isCollection = (theCase: Case | SubCase | null | undefined) =>
  theCase != null && (theCase as Case).type === CaseType.collection;

export const isIndividual = (theCase: Case | SubCase | null | undefined) =>
  theCase != null && (theCase as Case).type === CaseType.individual;

export const getSubCasesStatusCountsBadges = (
  subCases: SubCase[]
): Array<{ name: CaseStatuses; color: string; count: number }> => [
  {
    color: statuses[CaseStatuses.open].color,
    count: filter({ status: CaseStatuses.open }, subCases).length,
    name: CaseStatuses.open,
  },
  {
    color: statuses[CaseStatuses['in-progress']].color,
    count: filter({ status: CaseStatuses['in-progress'] }, subCases).length,
    name: CaseStatuses['in-progress'],
  },
  {
    color: statuses[CaseStatuses.closed].color,
    count: filter({ status: CaseStatuses.closed }, subCases).length,
    name: CaseStatuses.closed,
  },
];
