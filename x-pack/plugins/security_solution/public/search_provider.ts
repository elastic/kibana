/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import levenshtein from 'js-levenshtein';
import { ApplicationStart } from 'kibana/public';
import { from, of } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { GlobalSearchResultProvider, GlobalSearchProviderResult } from '../../global_search/public';

const searchableEntities: GlobalSearchProviderResult[] = [
  {
    id: 'securitySolution',
    title: i18n.translate('xpack.securitySolution.ruleCreationSearchTitle', {
      defaultMessage: 'Create Rule',
      description: '',
    }),
    type: 'application',
    icon: 'logoSecurity',
    meta: {
      categoryId: DEFAULT_APP_CATEGORIES.security.id,
      categoryLabel: DEFAULT_APP_CATEGORIES.security.label,
    },
    score: 0,
    //TODO: include base path in urls
    url: '/app/security/detections/rules/create',
  },
  {
    id: 'securitySolution',
    title: i18n.translate('xpack.securitySolution.caseCreationSearchTitle', {
      defaultMessage: 'Create Case',
      description: '',
    }),
    type: 'application',
    icon: 'logoSecurity',
    meta: {
      categoryId: DEFAULT_APP_CATEGORIES.security.id,
      categoryLabel: DEFAULT_APP_CATEGORIES.security.label,
    },
    score: 0,
    url: '/app/security/cases/create',
  },
  {
    id: 'securitySolution',
    title: i18n.translate('xpack.securitySolution.caseCreationSearchTitle', {
      defaultMessage: 'Manage Rules',
      description: '',
    }),
    type: 'application',
    icon: 'logoSecurity',
    meta: {
      categoryId: DEFAULT_APP_CATEGORIES.security.id,
      categoryLabel: DEFAULT_APP_CATEGORIES.security.label,
    },
    score: 0,
    url: '/app/security/detections/rules',
  },
];

function getScoredEntities(searchTerm: string): GlobalSearchProviderResult[] {
  return searchableEntities
    .map((entity) => {
      const searchableTitle = entity.title.toLowerCase();
      let score = 0;
      console.log(searchTerm, searchableTitle);
      if (searchableTitle === searchTerm) {
        score = 100;
      } else if (searchableTitle.startsWith(searchTerm)) {
        score = 90;
      } else if (searchableTitle.includes(searchTerm)) {
        score = 75;
      } else {
        const length = Math.max(searchTerm.length, searchableTitle.length);
        const distance = levenshtein(searchTerm, searchableTitle);
        const ratio = Math.floor((1 - distance / length) * 100);
        if (ratio >= 60) {
          score = ratio;
        }
      }
      entity.score = score;
      return entity;
    })
    .filter((entity) => entity.score > 0);
}

export const getSearchProvider: (
  uiCapabilities: Promise<ApplicationStart['capabilities']>
) => GlobalSearchResultProvider = (uiCapabilities) => ({
  id: 'securitySolution',
  find: ({ term = '', types, tags }) => {
    if (tags || (types && !types.includes('application'))) {
      return of([]);
    }
    return from(
      uiCapabilities.then(({ navLinks: { visualize: visualizeNavLink } }) => {
        if (!visualizeNavLink) {
          return [];
        }
        const searchableTerm = term.toLowerCase();
        console.log(getScoredEntities(searchableTerm));
        return getScoredEntities(searchableTerm);
      })
    );
  },
  getSearchableTypes: () => ['application'],
});
