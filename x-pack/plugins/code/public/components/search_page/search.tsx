/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import querystring from 'querystring';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import Url from 'url';

import { DocumentSearchResult, SearchScope } from '../../../model';
import { changeSearchScope } from '../../actions';
import { RootState } from '../../reducers';
import { history } from '../../utils/url';
import { ShortcutsProvider } from '../shortcuts';
import { CodeResult } from './code_result';
import { EmptyPlaceholder } from './empty_placeholder';
import { Pagination } from './pagination';
import { RepoItem } from './repository_item';
import { SearchBar } from './search_bar';
import { SideBar } from './side_bar';

const SearchContainer = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const MainContentContainer = styled.div`
  overflow-y: scroll;
  padding: 16px;
`;

const CodeResultContainer = styled.div`
  margin-top: 16px;
`;

const RepositoryResultContainer = CodeResultContainer;

interface Props {
  query: string;
  scope: SearchScope;
  page?: number;
  languages?: Set<string>;
  repositories?: Set<string>;
  isLoading: boolean;
  error?: Error;
  documentSearchResults?: DocumentSearchResult;
  repositorySearchResults?: any;
  onSearchScopeChanged: (s: SearchScope) => void;
}

interface State {
  uri: string;
}

class SearchPage extends React.PureComponent<Props, State> {
  public state = {
    uri: '',
  };

  public onLanguageFilterToggled = (lang: string) => {
    const { languages, repositories, query, page } = this.props;
    let tempLangs: Set<string> = new Set();
    if (languages && languages.has(lang)) {
      // Remove this language filter
      tempLangs = new Set(languages);
      tempLangs.delete(lang);
    } else {
      // Add this language filter
      tempLangs = languages ? new Set(languages) : new Set();
      tempLangs.add(lang);
    }
    const queries = querystring.parse(history.location.search.replace('?', ''));
    return () => {
      history.push(
        Url.format({
          pathname: '/search',
          query: {
            ...queries,
            q: query,
            p: page,
            langs: Array.from(tempLangs).join(','),
            repos: repositories ? Array.from(repositories).join(',') : undefined,
          },
        })
      );
    };
  };

  public onRepositoryFilterToggled = (repo: string) => {
    const { languages, repositories, query } = this.props;
    let tempRepos: Set<string> = new Set();
    if (repositories && repositories.has(repo)) {
      // Remove this repository filter
      tempRepos = new Set(repositories);
      tempRepos.delete(repo);
    } else {
      // Add this language filter
      tempRepos = repositories ? new Set(repositories) : new Set();
      tempRepos.add(repo);
    }
    const queries = querystring.parse(history.location.search.replace('?', ''));
    return () => {
      history.push(
        Url.format({
          pathname: '/search',
          query: {
            ...queries,
            q: query,
            p: 1,
            langs: languages ? Array.from(languages).join(',') : undefined,
            repos: Array.from(tempRepos).join(','),
          },
        })
      );
    };
  };

  public render() {
    const {
      query,
      scope,
      documentSearchResults,
      languages,
      repositories,
      repositorySearchResults,
    } = this.props;

    let mainComp = <EmptyPlaceholder query={query} />;
    let repoStats: any[] = [];
    let languageStats: any[] = [];
    if (
      scope === SearchScope.REPOSITORY &&
      repositorySearchResults &&
      repositorySearchResults.total > 0
    ) {
      const { repositories: repos } = repositorySearchResults;
      const resultComps =
        repos &&
        repos.map((repo: any) => (
          <EuiFlexItem key={repo.uri}>
            <RepoItem uri={repo.uri} />
          </EuiFlexItem>
        ));
      mainComp = (
        <MainContentContainer>
          <RepositoryResultContainer>{resultComps}</RepositoryResultContainer>
        </MainContentContainer>
      );
    } else if (
      scope === SearchScope.DEFAULT &&
      documentSearchResults &&
      documentSearchResults.total > 0
    ) {
      const { stats, results } = documentSearchResults!;
      const { total, from, to, page, totalPage } = stats!;
      languageStats = stats!.languageStats;
      repoStats = stats!.repoStats;

      const statsComp = (
        <EuiTitle size="m">
          <h1>
            Showing {from} - {to} of {total} results.
          </h1>
        </EuiTitle>
      );
      mainComp = (
        <MainContentContainer>
          {statsComp}
          <EuiSpacer />
          <CodeResultContainer>
            <CodeResult results={results!} />
          </CodeResultContainer>
          <Pagination query={this.props.query} totalPage={totalPage} currentPage={page - 1} />
        </MainContentContainer>
      );
    }

    return (
      <SearchContainer>
        <ShortcutsProvider />
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem style={{ maxWidth: '256px' }}>
            <SideBar
              query={this.props.query}
              scope={scope}
              repositories={repositories}
              languages={languages}
              repoFacets={repoStats}
              langFacets={languageStats}
              onLanguageFilterToggled={this.onLanguageFilterToggled}
              onRepositoryFilterToggled={this.onRepositoryFilterToggled}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <SearchBar
              query={this.props.query}
              onSearchScopeChanged={this.props.onSearchScopeChanged}
            />
            {mainComp}
          </EuiFlexItem>
        </EuiFlexGroup>
      </SearchContainer>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  ...state.search,
});

const mapDispatchToProps = {
  onSearchScopeChanged: changeSearchScope,
};

export const Search = connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchPage);
