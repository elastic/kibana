/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@elastic/lsp-extension';
import { IRange } from 'monaco-editor';

import { DiffKind } from '../common/git_diff';
import { Repository, SourceHit } from '../model';
import { RepositoryUri } from './repository';

export interface Document {
  repoUri: RepositoryUri;
  path: string;
  content: string;
  qnames: string[];
  language?: string;
  sha1?: string;
}

// The base interface of indexer requests
export interface IndexRequest {
  repoUri: RepositoryUri;
}

// The request for LspIndexer
export interface LspIndexRequest extends IndexRequest {
  localRepoPath: string; // The repository local file path
  filePath: string; // The file path within the repository
  revision: string; // The revision of the current repository
}

export interface LspIncIndexRequest extends LspIndexRequest {
  originPath?: string;
  kind: DiffKind;
  originRevision: string;
}

// The request for RepositoryIndexer
export interface RepositoryIndexRequest extends IndexRequest {
  repoUri: RepositoryUri;
}

// The base interface of any kind of search requests.
export interface SearchRequest {
  query: string;
  page: number;
  resultsPerPage?: number;
}

export interface RepositorySearchRequest extends SearchRequest {
  query: string;
  repoScope?: RepositoryUri[];
}

export interface DocumentSearchRequest extends SearchRequest {
  query: string;
  // repoFilters is used for search within these repos but return
  // search stats across all repositories.
  repoFilters?: string[];
  // repoScope hard limit the search coverage only to these repositories.
  repoScope?: RepositoryUri[];
  langFilters?: string[];
}
export interface SymbolSearchRequest extends SearchRequest {
  query: string;
  repoScope?: RepositoryUri[];
}

// The base interface of any kind of search result.
export interface SearchResult {
  total: number;
  took: number;
}

export interface RepositorySearchResult extends SearchResult {
  repositories: Repository[];
  from?: number;
  page?: number;
  totalPage?: number;
}

export interface SymbolSearchResult extends SearchResult {
  // TODO: we migit need an additional data structure for symbol search result.
  symbols: DetailSymbolInformation[];
}

// All the interfaces for search page

// The item of the search result stats. e.g. Typescript -> 123
export interface SearchResultStatsItem {
  name: string;
  value: number;
}

export interface SearchResultStats {
  total: number; // Total number of results
  from: number; // The beginning of the result range
  to: number; // The end of the result range
  page: number; // The page number
  totalPage: number; // The total number of pages
  repoStats: SearchResultStatsItem[];
  languageStats: SearchResultStatsItem[];
}

export interface CompositeSourceContent {
  content: string;
  lineMapping: string[];
  ranges: IRange[];
}

export interface SearchResultItem {
  uri: string;
  hits: number;
  filePath: string;
  language: string;
  compositeContent: CompositeSourceContent;
}

export interface DocumentSearchResult extends SearchResult {
  query: string;
  from?: number;
  page?: number;
  totalPage?: number;
  stats?: SearchResultStats;
  results?: SearchResultItem[];
  repoAggregations?: any[];
  langAggregations?: any[];
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceRange {
  startLoc: SourceLocation;
  endLoc: SourceLocation;
}

export interface SourceHit {
  range: SourceRange;
  score: number;
  term: string;
}

export enum SearchScope {
  DEFAULT = 'default', // Search everything
  SYMBOL = 'symbol', // Only search symbols
  REPOSITORY = 'repository', // Only search repositories
  FILE = 'file', // Only search files
}

export interface SearchOptions {
  repoScope: Repository[];
  defaultRepoScopeOn: boolean;
  defaultRepoScope?: Repository;
}
