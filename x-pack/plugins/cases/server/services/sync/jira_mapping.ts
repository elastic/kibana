/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { set } from '@kbn/safer-lodash-set';
import { get } from 'lodash';
import type { JiraIncidentResponse, Mapping, SyncFields } from './types';

export const getJiraToCaseMapping = (): Mapping[] => {
  return [
    {
      key: 'summary',
      caseField: 'title',
    },
    {
      key: 'description',
      caseField: 'description',
    },
    {
      key: 'status.id',
      caseField: 'status',
      translation: new Map([
        ['10000', CaseStatuses.open],
        ['10001', CaseStatuses['in-progress']],
        ['10002', CaseStatuses.closed],
      ]),
    },
  ];
};

export const translate = (incident: JiraIncidentResponse): SyncFields => {
  const caseCompareFields: SyncFields = { title: '', description: '', status: CaseStatuses.open };

  for (const { key, caseField, translation } of getJiraToCaseMapping()) {
    if (translation) {
      const value = get(incident, key, '');

      const translatedValue = translation.get(value) as CaseStatuses | undefined;

      if (!translatedValue) {
        throw new Error(`Failed to translate key: ${key} value: ${value}`);
      }

      set(caseCompareFields, caseField, translatedValue);
    } else {
      set(caseCompareFields, caseField, get(incident, key, ''));
    }
  }

  return caseCompareFields;
};
