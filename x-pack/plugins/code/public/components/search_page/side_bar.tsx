/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToken,
} from '@elastic/eui';
import React from 'react';

import { RepositoryUtils } from '../../../common/repository_utils';
import { SearchScope } from '../../../model';
import { ScopeTabs } from './scope_tabs';

interface Props {
  query: string;
  scope: SearchScope;
  languages?: Set<string>;
  repositories?: Set<string>;
  langFacets: any[];
  repoFacets: any[];
  onLanguageFilterToggled: (lang: string) => any;
  onRepositoryFilterToggled: (repo: string) => any;
}

export class SideBar extends React.PureComponent<Props> {
  public render() {
    const { languages, langFacets, repoFacets, repositories } = this.props;
    const repoStatsComp = repoFacets.map((item, index) => {
      if (!!repositories && repositories.has(item.name)) {
        return (
          <EuiFacetButton
            className="codeFilter__item"
            key={`repostats${index}`}
            onClick={this.props.onRepositoryFilterToggled(item.name)}
            quantity={item.value}
            isSelected={true}
            buttonRef={() => {
              /* nothing */
            }}
          >
            {RepositoryUtils.repoNameFromUri(item.name)}
          </EuiFacetButton>
        );
      } else {
        return (
          <EuiFacetButton
            className="codeFilter__item"
            key={`repostats${index}`}
            onClick={this.props.onRepositoryFilterToggled(item.name)}
            quantity={item.value}
            buttonRef={() => {
              /* nothing */
            }}
          >
            {RepositoryUtils.repoNameFromUri(item.name)}
          </EuiFacetButton>
        );
      }
    });

    const langStatsComp = langFacets.map((item, index) => {
      if (languages && languages.has(item.name)) {
        return (
          <EuiFacetButton
            className="codeFilter__item"
            key={`langstats${index}`}
            onClick={this.props.onLanguageFilterToggled(item.name)}
            quantity={item.value}
            isSelected={true}
            data-test-subj="codeSearchLanguageFilterItem"
            buttonRef={() => {
              /* nothing */
            }}
          >
            {item.name}
          </EuiFacetButton>
        );
      } else {
        return (
          <EuiFacetButton
            className="codeFilter__item"
            key={`langstats${index}`}
            onClick={this.props.onLanguageFilterToggled(item.name)}
            quantity={item.value}
            data-test-subj="codeSearchLanguageFilterItem"
            buttonRef={() => {
              /* nothing */
            }}
          >
            {item.name}
          </EuiFacetButton>
        );
      }
    });

    return (
      <div className="codeSidebar__container">
        <ScopeTabs query={this.props.query} scope={this.props.scope} />
        <div className="codeFilter__group">
          <EuiFlexGroup
            className="codeFilter__title"
            gutterSize="s"
            alignItems="center"
            style={{ marginBottom: '.5rem' }}
          >
            <EuiFlexItem grow={false}>
              <EuiToken iconType="tokenRepo" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>Repositories</h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFacetGroup>{repoStatsComp}</EuiFacetGroup>
          <EuiSpacer />
          <EuiFlexGroup
            className="codeFilter__title"
            gutterSize="s"
            alignItems="center"
            style={{ marginBottom: '.5rem' }}
          >
            <EuiFlexItem grow={false}>
              <EuiToken
                iconType="tokenElement"
                displayOptions={{ color: 'tokenTint07', shape: 'rectangle', fill: true }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>Languages</h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFacetGroup data-test-subj="codeSearchLanguageFilterList">
            {langStatsComp}
          </EuiFacetGroup>
        </div>
      </div>
    );
  }
}
