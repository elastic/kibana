/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiText, EuiToken, IconType } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import url from 'url';

import {
  AutocompleteSuggestion,
  AutocompleteSuggestionGroup,
  AutocompleteSuggestionType,
} from '../..';
import { SuggestionComponent } from './suggestion_component';

interface Props {
  query: string;
  groupIndex: number | null;
  itemIndex: number | null;
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: (groupIndex: number, itemIndex: number) => void;
  show: boolean;
  suggestionGroups: AutocompleteSuggestionGroup[];
  loadMore: () => void;
}

export class SuggestionsComponent extends Component<Props> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;

  private viewMoreUrl() {
    return url.format({
      pathname: '/search',
      query: {
        q: this.props.query,
      },
    });
  }

  public render() {
    if (!this.props.show || isEmpty(this.props.suggestionGroups)) {
      return null;
    }

    return (
      <div className="reactSuggestionTypeahead">
        <div className="kbnTypeahead">
          <div className="kbnTypeahead__popover">
            {this.renderSuggestionGroups()}
            <Link to={this.viewMoreUrl()}>
              <div className="codeSearch__full-text-button">
                Press ⮐ Return for Full Text Search
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  public componentDidUpdate(prevProps: Props) {
    if (
      prevProps.groupIndex !== this.props.groupIndex ||
      prevProps.itemIndex !== this.props.itemIndex
    ) {
      this.scrollIntoView();
    }
  }

  private renderSuggestionGroups() {
    return this.props.suggestionGroups
      .filter((group: AutocompleteSuggestionGroup) => group.suggestions.length > 0)
      .map((group: AutocompleteSuggestionGroup, groupIndex: number) => {
        const { suggestions, total, type, hasMore } = group;
        const suggestionComps = suggestions.map(
          (suggestion: AutocompleteSuggestion, itemIndex: number) => {
            const innerRef = (node: any) => (this.childNodes[itemIndex] = node);
            const mouseEnter = () => this.props.onMouseEnter(groupIndex, itemIndex);
            const isSelected =
              groupIndex === this.props.groupIndex && itemIndex === this.props.itemIndex;
            return (
              <SuggestionComponent
                query={this.props.query}
                innerRef={innerRef}
                selected={isSelected}
                suggestion={suggestion}
                onClick={this.props.onClick}
                onMouseEnter={mouseEnter}
                ariaId={`suggestion-${groupIndex}-${itemIndex}`}
                key={`${suggestion.tokenType} - ${groupIndex}-${itemIndex} - ${suggestion.text}`}
              />
            );
          }
        );

        const groupHeader = (
          <EuiFlexGroup
            justifyContent="spaceBetween"
            className="codeSearch-suggestion__group-header"
          >
            <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
              <EuiToken iconType={this.getGroupTokenType(group.type) as IconType} />
              <EuiText className="codeSearch-suggestion__group-title">
                {this.getGroupTitle(group.type)}
              </EuiText>
            </EuiFlexGroup>
            <div className="codeSearch-suggestion__group-result">
              {total} Result
              {total === 1 ? '' : 's'}
            </div>
          </EuiFlexGroup>
        );

        const viewMore = (
          <div className="codeSearch-suggestion__link">
            <Link to={this.viewMoreUrl()}>View More</Link>
          </div>
        );

        return (
          <div
            id="kbnTypeahead__items"
            className="kbnTypeahead__items codeSearch-suggestion__group"
            role="listbox"
            data-test-subj={`codeTypeaheadList-${type}`}
            ref={node => (this.parentNode = node)}
            onScroll={this.handleScroll}
            key={`${type}-suggestions`}
          >
            {groupHeader}
            {suggestionComps}
            {hasMore ? viewMore : null}
          </div>
        );
      });
  }

  private getGroupTokenType(type: AutocompleteSuggestionType): string {
    switch (type) {
      case AutocompleteSuggestionType.FILE:
        return 'tokenFile';
      case AutocompleteSuggestionType.REPOSITORY:
        return 'tokenRepo';
      case AutocompleteSuggestionType.SYMBOL:
        return 'tokenSymbol';
    }
  }

  private getGroupTitle(type: AutocompleteSuggestionType): string {
    switch (type) {
      case AutocompleteSuggestionType.FILE:
        return 'Files';
      case AutocompleteSuggestionType.REPOSITORY:
        return 'Repos';
      case AutocompleteSuggestionType.SYMBOL:
        return 'Symbols';
    }
  }

  private scrollIntoView = () => {
    if (this.props.groupIndex === null || this.props.itemIndex === null) {
      return;
    }
    const parent = this.parentNode;
    const child = this.childNodes[this.props.itemIndex];

    if (this.props.groupIndex == null || this.props.itemIndex === null || !parent || !child) {
      return;
    }

    const scrollTop = Math.max(
      Math.min(parent.scrollTop, child.offsetTop),
      child.offsetTop + child.offsetHeight - parent.offsetHeight
    );

    parent.scrollTop = scrollTop;
  };

  private handleScroll = () => {
    if (!this.props.loadMore || !this.parentNode) {
      return;
    }

    const position = this.parentNode.scrollTop + this.parentNode.offsetHeight;
    const height = this.parentNode.scrollHeight;
    const remaining = height - position;
    const margin = 50;

    if (!height || !position) {
      return;
    }
    if (remaining <= margin) {
      this.props.loadMore();
    }
  };
}
