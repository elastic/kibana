/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiFacetButton,
  // @ts-ignore
  EuiFacetGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToken,
} from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import styled from 'styled-components';

import { RepositoryUtils } from '../../../common/repository_utils';
import { SearchScope } from '../../../model';
import { ScopeTabs } from './scope_tabs';

const SideBarContainer = styled.div`
  background-color: ${theme.euiColorLightestShade};
  border-right: ${theme.euiBorderWidthThin} solid ${theme.euiBorderColor};
  flex-grow: 1;
  flex-shrink: 1;
  overflow: auto;
`;

const FacetContainer = styled.div`
  padding: 0 1rem;
`;

const FacetTitle = styled(EuiFlexGroup)`
  margin-top: ${theme.euiSizeS};
`;

const FacetItem = styled(EuiFacetButton)`
  height: calc(32rem / 14);
`;

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
          <FacetItem
            key={`repostats${index}`}
            onClick={this.props.onRepositoryFilterToggled(item.name)}
            quantity={item.value}
            isSelected={true}
          >
            {RepositoryUtils.repoNameFromUri(item.name)}
          </FacetItem>
        );
      } else {
        return (
          <FacetItem
            key={`repostats${index}`}
            onClick={this.props.onRepositoryFilterToggled(item.name)}
            quantity={item.value}
          >
            {RepositoryUtils.repoNameFromUri(item.name)}
          </FacetItem>
        );
      }
    });

    const langStatsComp = langFacets.map((item, index) => {
      if (languages && languages.has(item.name)) {
        return (
          <FacetItem
            key={`langstats${index}`}
            onClick={this.props.onLanguageFilterToggled(item.name)}
            quantity={item.value}
            isSelected={true}
            data-test-subj="codeSearchLanguageFilterItem"
          >
            {item.name}
          </FacetItem>
        );
      } else {
        return (
          <FacetItem
            key={`langstats${index}`}
            onClick={this.props.onLanguageFilterToggled(item.name)}
            quantity={item.value}
            data-test-subj="codeSearchLanguageFilterItem"
          >
            {item.name}
          </FacetItem>
        );
      }
    });

    return (
      <SideBarContainer>
        <ScopeTabs query={this.props.query} scope={this.props.scope} />
        <FacetContainer>
          <FacetTitle gutterSize="s" alignItems="center" style={{ marginBottom: '.5rem' }}>
            <EuiFlexItem grow={false}>
              <EuiToken iconType="tokenRepo" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Repositories</h3>
              </EuiTitle>
            </EuiFlexItem>
          </FacetTitle>
          <EuiFacetGroup>{repoStatsComp}</EuiFacetGroup>
          <EuiSpacer />
          <FacetTitle gutterSize="s" alignItems="center" style={{ marginBottom: '.5rem' }}>
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
          </FacetTitle>
          <EuiFacetGroup data-test-subj="codeSearchLanguageFilterList">
            {langStatsComp}
          </EuiFacetGroup>
        </FacetContainer>
      </SideBarContainer>
    );
  }
}
