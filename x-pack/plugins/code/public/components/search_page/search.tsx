/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiToken } from '@elastic/eui';
import querystring from 'querystring';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import Url from 'url';

import { DocumentSearchResult } from '../../../model';
import { documentSearch } from '../../actions';
import { SearchScope } from '../../common/types';
import { RootState } from '../../reducers';
import { history } from '../../utils/url';
import { CodeResult } from './code_result';
import { EmptyPlaceholder } from './empty_placeholder';
import { Facet } from './facet';
import { Pagination } from './pagination';
import { RepoItem } from './repository_item';
import { ScopeTab } from './scope_tab';
import { SearchBar } from './search_bar';

const SearchContainer = styled.div`
  height: 100%;
`;

const MainContentContainer = styled(EuiFlexItem)`
  height: calc(100vh - 128px);
  overflow-y: scroll;
  padding: '0 1rem';
  margin-right: 0px;
`;

const CodeResultContainer = styled.div`
  margin-top: 80px;
`;

interface Props {
  query: string;
  page?: number;
  languages?: Set<string>;
  repositories?: Set<string>;
  isLoading: boolean;
  error?: Error;
  searchResult?: DocumentSearchResult;
  documentSearch: (q: string, p: number) => void;
  repositorySearch: any;
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
    const { query, searchResult, languages, repositories, repositorySearch } = this.props;

    if (repositorySearch.scope === SearchScope.repository) {
      const { repositories: repos } = repositorySearch.repositories;
      const resultComps =
        repos && repos.map((repo: any) => <RepoItem key={repo.uri} uri={repo.uri} />);
      const mainComp = (
        <EuiFlexGroup style={{ padding: '0 1rem' }}>
          <EuiFlexItem grow={2}>
            <EuiFlexGroup gutterSize="s" alignItems="center" style={{ marginBottom: '.5rem' }}>
              <EuiFlexItem grow={false}>
                <EuiToken iconType="tokenRepo" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>Repositories</h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup gutterSize="s" alignItems="center" style={{ marginBottom: '.5rem' }}>
              <EuiFlexItem grow={false}>
                <EuiToken
                  iconType="tokenElement"
                  displayOptions={{ color: 'tokenTint07', shape: 'rectangle', fill: true }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>Languages</h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <MainContentContainer grow={8}>{resultComps}</MainContentContainer>
        </EuiFlexGroup>
      );
      return (
        <SearchContainer>
          <SearchBar query={query} />
          <ScopeTab query={query} scope={repositorySearch.scope} />
          {mainComp}
        </SearchContainer>
      );
    }

    if (searchResult) {
      const { stats, results } = searchResult!;
      const { total, from, to, page, totalPage, repoStats, languageStats } = stats!;

      const statsComp = (
        <EuiTitle size="m">
          <h1>
            Showing {from} - {to} of {total} results.
          </h1>
        </EuiTitle>
      );

      const mainComp = (
        <EuiFlexGroup style={{ paddingRight: '1rem' }}>
          <Facet
            repositories={repositories}
            languages={languages}
            repoFacets={repoStats}
            langFacets={languageStats}
            onLanguageFilterToggled={this.onLanguageFilterToggled}
            onRepositoryFilterToggled={this.onRepositoryFilterToggled}
          />
          <MainContentContainer grow={8}>
            <EuiFlexGroup>
              <EuiFlexItem>{statsComp}</EuiFlexItem>
              <EuiFlexItem>
                <ScopeTab query={query} scope={repositorySearch.scope} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <CodeResultContainer>
              <CodeResult results={results!} />
            </CodeResultContainer>
            <Pagination query={this.props.query} totalPage={totalPage} currentPage={page - 1} />
          </MainContentContainer>
        </EuiFlexGroup>
      );

      return (
        <SearchContainer>
          <SearchBar query={this.props.query} />
          {mainComp}
        </SearchContainer>
      );
    } else {
      return (
        <SearchContainer>
          <SearchBar query={this.props.query} />
          <EmptyPlaceholder />
        </SearchContainer>
      );
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  ...state.documentSearch,
  repositorySearch: state.repositorySearch,
});

const mapDispatchToProps = {
  documentSearch,
};

export const Search = connect(
  mapStateToProps,
  mapDispatchToProps
  // @ts-ignore
)(SearchPage);
