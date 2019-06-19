/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { DocumentSearchResult, Repository, SearchOptions, SearchScope } from '../../model';

export interface DocumentSearchPayload {
  query: string;
  page?: string;
  languages?: string;
  repositories?: string;
  repoScope?: string;
}

export interface RepositorySearchPayload {
  query: string;
}

// For document search page
export const documentSearch = createAction<DocumentSearchPayload>('DOCUMENT SEARCH');
export const documentSearchSuccess = createAction<DocumentSearchResult>('DOCUMENT SEARCH SUCCESS');
export const documentSearchFailed = createAction<Error>('DOCUMENT SEARCH FAILED');

// For repository search page
export const repositorySearch = createAction<RepositorySearchPayload>('REPOSITORY SEARCH');
export const repositorySearchSuccess = createAction('REPOSITORY SEARCH SUCCESS');
export const repositorySearchFailed = createAction<Error>('REPOSITORY SEARCH FAILED');

export const changeSearchScope = createAction<SearchScope>('CHANGE SEARCH SCOPE');

export const suggestionSearch = createAction<string>('SUGGESTION SEARCH');

// For repository search typeahead
export const repositorySearchQueryChanged = createAction<RepositorySearchPayload>(
  'REPOSITORY SEARCH QUERY CHANGED'
);
export const repositoryTypeaheadSearchSuccess = createAction<string>('REPOSITORY SEARCH SUCCESS');
export const repositoryTypeaheadSearchFailed = createAction<string>('REPOSITORY SEARCH FAILED');

export const saveSearchOptions = createAction<SearchOptions>('SAVE SEARCH OPTIONS');

export const turnOnDefaultRepoScope = createAction<Repository>('TURN ON DEFAULT REPO SCOPE');
export const turnOffDefaultRepoScope = createAction('TURN OFF DEFAULT REPO SCOPE');

export const searchReposForScope = createAction<RepositorySearchPayload>('SEARCH REPOS FOR SCOPE');
export const searchReposForScopeSuccess = createAction<any>('SEARCH REPOS FOR SCOPE SUCCESS');
export const searchReposForScopeFailed = createAction<any>('SEARCH REPOS FOR SCOPE FAILED');
