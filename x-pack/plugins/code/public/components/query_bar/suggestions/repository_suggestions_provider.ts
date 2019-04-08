/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';

import {
  AbstractSuggestionsProvider,
  AutocompleteSuggestionGroup,
  AutocompleteSuggestionType,
} from '.';
import { toRepoNameWithOrg } from '../../../../common/uri_util';
import { Repository, SearchScope } from '../../../../model';

export class RepositorySuggestionsProvider extends AbstractSuggestionsProvider {
  protected matchSearchScope(scope: SearchScope): boolean {
    return scope === SearchScope.DEFAULT || scope === SearchScope.REPOSITORY;
  }

  protected async fetchSuggestions(
    query: string,
    repoScope?: string[]
  ): Promise<AutocompleteSuggestionGroup> {
    try {
      const queryParams: { q: string; repoScope?: string } = { q: query };
      if (repoScope && repoScope.length > 0) {
        queryParams.repoScope = repoScope.join(',');
      }
      const res = await kfetch({
        pathname: `/api/code/suggestions/repo`,
        method: 'get',
        query: queryParams,
      });
      const suggestions = Array.from(res.repositories as Repository[])
        .slice(0, this.MAX_SUGGESTIONS_PER_GROUP)
        .map((repo: Repository) => {
          return {
            description: repo.url,
            end: 10,
            start: 1,
            text: toRepoNameWithOrg(repo.uri),
            tokenType: '',
            selectUrl: `/${repo.uri}`,
          };
        });
      return {
        type: AutocompleteSuggestionType.REPOSITORY,
        total: res.total,
        hasMore: res.total > this.MAX_SUGGESTIONS_PER_GROUP,
        suggestions,
      };
    } catch (error) {
      return {
        type: AutocompleteSuggestionType.REPOSITORY,
        total: 0,
        hasMore: false,
        suggestions: [],
      };
    }
  }
}
