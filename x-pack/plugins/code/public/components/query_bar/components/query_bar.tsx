/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { debounce, isEqual } from 'lodash';
import React, { Component } from 'react';

import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiOutsideClickDetector } from '@elastic/eui';
import { connect } from 'react-redux';
import { saveSearchOptions, searchReposForScope, suggestionSearch } from '../../../actions';
import { matchPairs } from '../lib/match_pairs';
import { SuggestionsComponent } from './typeahead/suggestions_component';

import { SearchOptions as ISearchOptions, SearchScope, Repository } from '../../../../model';
import { SearchScopePlaceholderText } from '../../../common/types';
import { RootState } from '../../../reducers';
import {
  AutocompleteSuggestion,
  AutocompleteSuggestionGroup,
  SuggestionsProvider,
} from '../suggestions';
import { SearchOptions } from './options';
import { ScopeSelector } from './scope_selector';

const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  ESC: 27,
  TAB: 9,
  HOME: 36,
  END: 35,
};

interface Props {
  query: string;
  onSubmit: (query: string) => void;
  onSelect: (item: AutocompleteSuggestion, query: string) => void;
  onSuggestionQuerySubmitted?: (query: string) => void;
  disableAutoFocus?: boolean;
  appName: string;
  suggestionProviders: SuggestionsProvider[];
  repositorySearch: (p: { query: string }) => void;
  saveSearchOptions: (searchOptions: ISearchOptions) => void;
  enableSubmitWhenOptionsChanged: boolean;
  onSearchScopeChanged: (s: SearchScope) => void;
  repoSearchResults: any[];
  searchLoading: boolean;
  searchScope: SearchScope;
  searchOptions: ISearchOptions;
  defaultRepoOptions: Repository[];
  currentRepository?: Repository;
}

interface State {
  query: string;
  inputIsPristine: boolean;
  isSuggestionsVisible: boolean;
  groupIndex: number | null;
  itemIndex: number | null;
  suggestionGroups: AutocompleteSuggestionGroup[];
  currentProps?: Props;
}

export class CodeQueryBar extends Component<Props, State> {
  public static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (isEqual(prevState.currentProps, nextProps)) {
      return null;
    }

    const nextState: any = {
      currentProps: nextProps,
    };
    if (nextProps.query !== prevState.query) {
      nextState.query = nextProps.query;
    }
    return nextState;
  }

  /*
   Keep the "draft" value in local state until the user actually submits the query. There are a couple advantages:

    1. Each app doesn't have to maintain its own "draft" value if it wants to put off updating the query in app state
    until the user manually submits their changes. Most apps have watches on the query value in app state so we don't
    want to trigger those on every keypress. Also, some apps (e.g. dashboard) already juggle multiple query values,
    each with slightly different semantics and I'd rather not add yet another variable to the mix.

    2. Changes to the local component state won't trigger an Angular digest cycle. Triggering digest cycles on every
    keypress has been a major source of performance issues for us in previous implementations of the query bar.
    See https://github.com/elastic/kibana/issues/14086
  */
  public state = {
    query: this.props.query,
    inputIsPristine: true,
    isSuggestionsVisible: false,
    groupIndex: null,
    itemIndex: null,
    suggestionGroups: [],
    showOptions: false,
  };

  public updateSuggestions = debounce(async () => {
    const suggestionGroups = (await this.getSuggestions()) || [];
    if (!this.componentIsUnmounting) {
      this.setState({ suggestionGroups });
    }
  }, 100);

  public inputRef: HTMLInputElement | null = null;

  public optionFlyout: any | null = null;

  private componentIsUnmounting = false;

  public isDirty = () => {
    return this.state.query !== this.props.query;
  };

  public loadMore = () => {
    // TODO(mengwei): Add action for load more.
  };

  public incrementIndex = (currGroupIndex: number, currItemIndex: number) => {
    let nextItemIndex = currItemIndex + 1;

    if (currGroupIndex === null) {
      currGroupIndex = 0;
    }
    let nextGroupIndex = currGroupIndex;

    const group: AutocompleteSuggestionGroup = this.state.suggestionGroups[currGroupIndex];
    if (currItemIndex === null || nextItemIndex >= group.suggestions.length) {
      nextItemIndex = 0;
      nextGroupIndex = currGroupIndex + 1;
      if (nextGroupIndex >= this.state.suggestionGroups.length) {
        nextGroupIndex = 0;
      }
    }

    this.setState({
      groupIndex: nextGroupIndex,
      itemIndex: nextItemIndex,
    });
  };

  public decrementIndex = (currGroupIndex: number, currItemIndex: number) => {
    let prevItemIndex = currItemIndex - 1;

    if (currGroupIndex === null) {
      currGroupIndex = this.state.suggestionGroups.length - 1;
    }
    let prevGroupIndex = currGroupIndex;

    if (currItemIndex === null || prevItemIndex < 0) {
      prevGroupIndex = currGroupIndex - 1;
      if (prevGroupIndex < 0) {
        prevGroupIndex = this.state.suggestionGroups.length - 1;
      }
      const group: AutocompleteSuggestionGroup = this.state.suggestionGroups[prevGroupIndex];
      prevItemIndex = group.suggestions.length - 1;
    }

    this.setState({
      groupIndex: prevGroupIndex,
      itemIndex: prevItemIndex,
    });
  };

  public getSuggestions = async () => {
    if (!this.inputRef) {
      return;
    }

    const { query } = this.state;
    if (query.length === 0) {
      return [];
    }

    if (!this.props.suggestionProviders || this.props.suggestionProviders.length === 0) {
      return [];
    }

    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    if (this.props.onSuggestionQuerySubmitted) {
      this.props.onSuggestionQuerySubmitted(query);
    }

    const res = await Promise.all(
      this.props.suggestionProviders.map((provider: SuggestionsProvider) => {
        // Merge the default repository scope if necessary.
        const repoScopes = this.props.searchOptions.repoScope.map(repo => repo.uri);
        if (
          this.props.searchOptions.defaultRepoScopeOn &&
          this.props.searchOptions.defaultRepoScope
        ) {
          repoScopes.push(this.props.searchOptions.defaultRepoScope.uri);
        }
        return provider.getSuggestions(query, this.props.searchScope, repoScopes);
      })
    );

    return res.filter((group: AutocompleteSuggestionGroup) => group.suggestions.length > 0);
  };

  public selectSuggestion = (item: AutocompleteSuggestion) => {
    if (!this.inputRef) {
      return;
    }

    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }
    this.setState(
      {
        query: this.state.query,
        groupIndex: null,
        itemIndex: null,
        isSuggestionsVisible: false,
      },
      () => {
        if (item) {
          this.props.onSelect(item, this.state.query);
        }
      }
    );
  };

  public onOutsideClick = () => {
    this.setState({ isSuggestionsVisible: false, groupIndex: null, itemIndex: null });
  };

  public onClickInput = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      this.onInputChange(event.target.value);
    }
  };

  public onClickSubmitButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    this.onSubmit(() => event.preventDefault());
  };

  public onClickSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!this.inputRef) {
      return;
    }
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  public onMouseEnterSuggestion = (groupIndex: number, itemIndex: number) => {
    this.setState({ groupIndex, itemIndex });
  };

  public onInputChange = (value: string) => {
    const hasValue = Boolean(value.trim());

    this.setState({
      query: value,
      inputIsPristine: false,
      isSuggestionsVisible: hasValue,
      groupIndex: null,
      itemIndex: null,
    });
  };

  public onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.updateSuggestions();
    this.onInputChange(event.target.value);
  };

  public onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ([KEY_CODES.LEFT, KEY_CODES.RIGHT, KEY_CODES.HOME, KEY_CODES.END].includes(event.keyCode)) {
      this.setState({ isSuggestionsVisible: true });
      if (event.target instanceof HTMLInputElement) {
        this.onInputChange(event.target.value);
      }
    }
  };

  public onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      const { isSuggestionsVisible, groupIndex, itemIndex } = this.state;
      const preventDefault = event.preventDefault.bind(event);
      const { target, key, metaKey } = event;
      const { value, selectionStart, selectionEnd } = target;
      const updateQuery = (query: string, newSelectionStart: number, newSelectionEnd: number) => {
        this.setState(
          {
            query,
          },
          () => {
            target.setSelectionRange(newSelectionStart, newSelectionEnd);
          }
        );
      };

      switch (event.keyCode) {
        case KEY_CODES.DOWN:
          event.preventDefault();
          if (isSuggestionsVisible && groupIndex !== null && itemIndex !== null) {
            this.incrementIndex(groupIndex, itemIndex);
          } else {
            this.setState({ isSuggestionsVisible: true, groupIndex: 0, itemIndex: 0 });
          }
          break;
        case KEY_CODES.UP:
          event.preventDefault();
          if (isSuggestionsVisible && groupIndex !== null && itemIndex !== null) {
            this.decrementIndex(groupIndex, itemIndex);
          } else {
            const lastGroupIndex = this.state.suggestionGroups.length - 1;
            const group: AutocompleteSuggestionGroup = this.state.suggestionGroups[lastGroupIndex];
            if (group !== null) {
              const lastItemIndex = group.suggestions.length - 1;
              this.setState({
                isSuggestionsVisible: true,
                groupIndex: lastGroupIndex,
                itemIndex: lastItemIndex,
              });
            }
          }
          break;
        case KEY_CODES.ENTER:
          event.preventDefault();
          if (
            isSuggestionsVisible &&
            groupIndex !== null &&
            itemIndex !== null &&
            this.state.suggestionGroups[groupIndex]
          ) {
            const group: AutocompleteSuggestionGroup = this.state.suggestionGroups[groupIndex];
            this.selectSuggestion(group.suggestions[itemIndex]);
          } else {
            this.onSubmit(() => event.preventDefault());
          }
          break;
        case KEY_CODES.ESC:
          event.preventDefault();
          this.setState({ isSuggestionsVisible: false, groupIndex: null, itemIndex: null });
          break;
        case KEY_CODES.TAB:
          this.setState({ isSuggestionsVisible: false, groupIndex: null, itemIndex: null });
          break;
        default:
          if (selectionStart !== null && selectionEnd !== null) {
            matchPairs({
              value,
              selectionStart,
              selectionEnd,
              key,
              metaKey,
              updateQuery,
              preventDefault,
            });
          }

          break;
      }
    }
  };

  public onSubmit = (preventDefault?: () => void) => {
    if (preventDefault) {
      preventDefault();
    }

    this.props.onSubmit(this.state.query);
    this.setState({ isSuggestionsVisible: false });
  };

  public componentDidMount() {
    this.updateSuggestions();
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.query !== this.props.query) {
      this.updateSuggestions();
    }

    // When search options (e.g. repository scopes) change,
    // submit the search query again to refresh the search result.
    if (
      this.props.enableSubmitWhenOptionsChanged &&
      !_.isEqual(prevProps.searchOptions, this.props.searchOptions)
    ) {
      this.onSubmit();
    }
  }

  public componentWillUnmount() {
    this.updateSuggestions.cancel();
    this.componentIsUnmounting = true;
  }

  public focusInput() {
    if (this.inputRef) {
      this.inputRef.focus();
    }
  }

  public toggleOptionsFlyout() {
    if (this.optionFlyout) {
      this.optionFlyout.toggleOptionsFlyout();
    }
  }

  public render() {
    const inputRef = (node: HTMLInputElement | null) => {
      if (node) {
        this.inputRef = node;
      }
    };
    const activeDescendant = this.state.isSuggestionsVisible
      ? `suggestion-${this.state.groupIndex}-${this.state.itemIndex}`
      : '';
    return (
      <EuiFlexGroup responsive={false} gutterSize="none">
        <EuiFlexItem grow={false}>
          <ScopeSelector
            scope={this.props.searchScope}
            onScopeChanged={this.props.onSearchScopeChanged}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiOutsideClickDetector onOutsideClick={this.onOutsideClick}>
            {/* position:relative required on container so the suggestions appear under the query bar*/}
            <div
              style={{ position: 'relative' }}
              role="combobox"
              aria-haspopup="true"
              aria-expanded={this.state.isSuggestionsVisible}
              aria-owns="typeahead-items"
              aria-controls="typeahead-items"
            >
              <form name="queryBarForm">
                <div className="kuiLocalSearch" role="search">
                  <div className="kuiLocalSearchAssistedInput">
                    <EuiFieldText
                      className="kuiLocalSearchAssistedInput__input codeSearchBar__input"
                      placeholder={SearchScopePlaceholderText[this.props.searchScope]}
                      value={this.state.query}
                      onKeyDown={this.onKeyDown}
                      onKeyUp={this.onKeyUp}
                      onChange={this.onChange}
                      onClick={this.onClickInput}
                      fullWidth={true}
                      autoFocus={!this.props.disableAutoFocus}
                      inputRef={inputRef}
                      autoComplete="off"
                      spellCheck={false}
                      aria-label="Search input"
                      type="text"
                      data-test-subj="queryInput"
                      aria-autocomplete="list"
                      aria-controls="typeahead-items"
                      aria-activedescendant={activeDescendant}
                      role="textbox"
                    />
                    <SearchOptions
                      defaultRepoOptions={this.props.defaultRepoOptions}
                      defaultSearchScope={this.props.currentRepository}
                      repositorySearch={this.props.repositorySearch}
                      saveSearchOptions={this.props.saveSearchOptions}
                      repoSearchResults={this.props.repoSearchResults}
                      searchLoading={this.props.searchLoading}
                      searchOptions={this.props.searchOptions}
                      ref={element => (this.optionFlyout = element)}
                    />
                  </div>
                </div>
              </form>

              <SuggestionsComponent
                query={this.state.query}
                show={this.state.isSuggestionsVisible}
                suggestionGroups={this.state.suggestionGroups}
                groupIndex={this.state.groupIndex}
                itemIndex={this.state.itemIndex}
                onClick={this.onClickSuggestion}
                onMouseEnter={this.onMouseEnterSuggestion}
                loadMore={this.loadMore}
              />
            </div>
          </EuiOutsideClickDetector>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  repoSearchResults: state.search.scopeSearchResults.repositories,
  searchLoading: state.search.isScopeSearchLoading,
  searchScope: state.search.scope,
  searchOptions: state.search.searchOptions,
  defaultRepoOptions: state.repository.repositories.slice(0, 5),
  currentRepository: state.repository.currentRepository,
});

const mapDispatchToProps = {
  repositorySearch: searchReposForScope,
  saveSearchOptions,
  onSuggestionQuerySubmitted: suggestionSearch,
};

export const QueryBar = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { withRef: true }
)(CodeQueryBar);
