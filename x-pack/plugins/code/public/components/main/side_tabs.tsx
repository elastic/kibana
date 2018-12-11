/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import { parse as parseQuery } from 'query-string';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { QueryString } from 'ui/utils/query_string';
import { MainRouteParams, PathTypes } from '../../common/types';
import { colors } from '../../style/variables';
import { FileTree } from '../file_tree/file_tree';
import { SymbolTree } from '../symbol_tree/symbol_tree';

enum Tabs {
  file = 'file',
  structure = 'structure',
}

const Container = styled.div`
  border-right: 1px solid ${colors.borderGrey};
  display: flex;
  flex-direction: column;
`;

const FileTreeContainer = styled.div`
  flex-grow: 1;
  flex-shrink: 1;
  overflow: auto;
  padding: 20px 16px;
`;

class CodeSideTabs extends React.PureComponent<RouteComponentProps<MainRouteParams>> {
  public tabContentMap = {
    [Tabs.file]: (
      <FileTreeContainer>
        <FileTree />
      </FileTreeContainer>
    ),
    [Tabs.structure]: <SymbolTree />,
  };

  public get sideTab(): Tabs {
    const tab = parseQuery(this.props.location.search).tab;
    return tab === Tabs.structure ? Tabs.structure : Tabs.file;
  }

  public switchTab = (tab: Tabs) => {
    const { history } = this.props;
    const { pathname, search } = history.location;
    // @ts-ignore
    history.push(QueryString.replaceParamInUrl(`${pathname}${search}`, 'tab', tab));
  };

  public renderTabs = () => {
    const clickFileTreeHandler = () => this.switchTab(Tabs.file);
    const clickStructureTreeHandler = () => this.switchTab(Tabs.structure);
    return (
      <React.Fragment>
        <EuiTab onClick={clickFileTreeHandler} isSelected={Tabs.file === this.sideTab}>
          File Tree
        </EuiTab>
        <EuiTab
          onClick={clickStructureTreeHandler}
          isSelected={Tabs.structure === this.sideTab}
          disabled={this.props.match.params.pathType === PathTypes.tree}
        >
          Structure Tree
        </EuiTab>
      </React.Fragment>
    );
  };

  public render() {
    return (
      <Container>
        <div>
          <EuiTabs>{this.renderTabs()}</EuiTabs>
        </div>
        {this.tabContentMap[this.sideTab]}
      </Container>
    );
  }
}

export const SideTabs = withRouter(CodeSideTabs);
