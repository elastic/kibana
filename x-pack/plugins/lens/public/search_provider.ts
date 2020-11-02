/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import levenshtein from 'js-levenshtein';
import { ApplicationStart } from 'kibana/public';
import { from } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { GlobalSearchResultProvider } from '../../global_search/public';
import { getFullPath } from '../common';

/**
 * Global search provider adding a Lens entry.
 * This is necessary because Lens does not show up in the nav bar and is filtered out by the
 * default app provider.
 *
 * It is inlining the same search term matching logic as the application search provider.
 *
 * TODO: This is a workaround and can be removed once there is a generic way to register sub features
 * of apps. In this case, Lens should be considered a feature of Visualize.
 */
export const getSearchProvider: (
  uiCapabilities: Promise<ApplicationStart['capabilities']>
) => GlobalSearchResultProvider = (uiCapabilities) => ({
  id: 'lens',
  find: (term) => {
    return from(
      uiCapabilities.then(({ navLinks: { visualize: visualizeNavLink } }) => {
        if (!visualizeNavLink) {
          return [];
        }
        const title = i18n.translate('xpack.lens.searchTitle', {
          defaultMessage: 'Lens: create visualizations',
          description: 'Lens is a product name and should not be translated',
        });
        const searchableTitle = title.toLowerCase();

        term = term.toLowerCase();
        let score = 0;

        // shortcuts to avoid calculating the distance when there is an exact match somewhere.
        if (searchableTitle === term) {
          score = 100;
        } else if (searchableTitle.startsWith(term)) {
          score = 90;
        } else if (searchableTitle.includes(term)) {
          score = 75;
        } else {
          const length = Math.max(term.length, searchableTitle.length);
          const distance = levenshtein(term, searchableTitle);

          // maximum lev distance is length, we compute the match ratio (lower distance is better)
          const ratio = Math.floor((1 - distance / length) * 100);
          if (ratio >= 60) {
            score = ratio;
          }
        }
        if (score === 0) return [];
        return [
          {
            id: 'lens',
            title,
            type: 'application',
            icon: 'logoKibana',
            meta: {
              categoryId: DEFAULT_APP_CATEGORIES.kibana.id,
              categoryLabel: DEFAULT_APP_CATEGORIES.kibana.label,
            },
            score,
            url: getFullPath(),
          },
        ];
      })
    );
  },
});
