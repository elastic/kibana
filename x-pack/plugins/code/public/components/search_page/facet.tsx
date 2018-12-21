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
import {
  euiBorderColor,
  euiBorderWidthThin,
  euiSizeS,
} from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import styled from 'styled-components';

import { RepositoryUtils } from '../../../common/repository_utils';

const FacetContainer = styled(EuiFlexItem)`
  width: 256px;
  min-width: 256px;
  height: calc(100vh - 128px);
  border-right: ${euiBorderWidthThin} solid ${euiBorderColor};
`;

const FacetTitle = styled(EuiFlexGroup)`
  margin-top: ${euiSizeS};
`;

const FacetItem = styled(EuiFacetButton)`
  height: 32px;
`;

interface Props {
  languages?: Set<string>;
  repositories?: Set<string>;
  langFacets: any[];
  repoFacets: any[];
  onLanguageFilterToggled: (lang: string) => any;
  onRepositoryFilterToggled: (repo: string) => any;
}

export class Facet extends React.PureComponent<Props> {
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
          >
            {item.name}
          </FacetItem>
        );
      } else {
        return (
          <FacetItem
            key={`repostats${index}`}
            onClick={this.props.onLanguageFilterToggled(item.name)}
            quantity={item.value}
          >
            {item.name}
          </FacetItem>
        );
      }
    });

    return (
      <FacetContainer grow={2}>
        <div style={{ padding: '0 1rem' }}>
          <div>
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
          </div>
          <EuiSpacer />
          <div>
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
            <EuiFacetGroup>{langStatsComp}</EuiFacetGroup>
          </div>
        </div>
      </FacetContainer>
    );
  }
}
