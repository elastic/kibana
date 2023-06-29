/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { set } from '@kbn/safer-lodash-set';
import { get } from 'lodash';
import type { JiraIncidentResponse, Mapping, MappingEntry, SyncFields } from './types';

const TODO = 'To Do';
const IN_PROGRESS = 'In Progress';
const DONE = 'Done';

// TODO: move this to the connectors directory within cases
export const getJiraToCaseMapping = (): Mapping => {
  const mapping = [
    {
      key: 'summary',
      caseField: 'title',
    },
    {
      key: 'description',
      caseField: 'description',
    },
    {
      key: 'status.name',
      caseField: 'status',
      translateToCase: new Map([
        [TODO, CaseStatuses.open],
        [IN_PROGRESS, CaseStatuses['in-progress']],
        [DONE, CaseStatuses.closed],
      ]),
      translateToExternal: new Map([
        [CaseStatuses.open, TODO],
        [CaseStatuses['in-progress'], IN_PROGRESS],
        [CaseStatuses.closed, DONE],
      ]),
    },
  ];

  const jiraToCase = new Map<string, MappingEntry>(mapping.map((entry) => [entry.key, entry]));
  const caseToJira = new Map<string, MappingEntry>(
    mapping.map((entry) => [entry.caseField, entry])
  );

  return {
    mapping,
    externalToCase: jiraToCase,
    caseToExternal: caseToJira,
  };
};

export const translate = (incident: JiraIncidentResponse): SyncFields => {
  const caseCompareFields: SyncFields = { title: '', description: '', status: CaseStatuses.open };

  const jiraMapping = getJiraToCaseMapping();

  for (const { key, caseField, translateToCase: translation } of jiraMapping.mapping) {
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
