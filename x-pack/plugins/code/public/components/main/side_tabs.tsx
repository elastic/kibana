/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { parse as parseQuery } from 'querystring';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { QueryString } from 'ui/utils/query_string';
import { MainRouteParams, PathTypes } from '../../common/types';
import { FileTree } from '../file_tree/file_tree';
import { Shortcut } from '../shortcuts';
import { SymbolTree } from '../symbol_tree/symbol_tree';

enum Tabs {
  file = 'file',
  structure = 'structure',
}

const Container = styled.div`
  width: calc(256rem / 14);
  border-right: ${theme.euiBorderThin};
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  flex-direction: column;
  & > div {
    height: 100%;
    display: flex;
    flex-direction: column;
    & > div:first-child {
      flex-shrink: 0;
      flex-grow: 0;
    }
    & > div:not(:first-child) {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      flex-shrink: 1;
    }
  }
`;

const FileTreeContainer = styled.div`
  flex-grow: 1;
  flex-shrink: 1;
  overflow: auto;
  padding: ${theme.paddingSizes.l} ${theme.paddingSizes.m};
  background-color: ${theme.euiColorLightestShade};
`;

class CodeSideTabs extends React.PureComponent<RouteComponentProps<MainRouteParams>> {
  public get sideTab(): Tabs {
    const { search } = this.props.location;
    let qs = search;
    if (search.charAt(0) === '?') {
      qs = search.substr(1);
    }
    const tab = parseQuery(qs).tab;
    return tab === Tabs.structure ? Tabs.structure : Tabs.file;
  }

  public get tabs() {
    return [
      {
        id: Tabs.file,
        name: 'File',
        content: (
          <FileTreeContainer>
            <FileTree />
          </FileTreeContainer>
        ),
        isSelected: Tabs.file === this.sideTab,
        'data-test-subj': 'codeFileTreeTab',
      },
      {
        id: Tabs.structure,
        name: 'Structure',
        content: <SymbolTree />,
        isSelected: Tabs.structure === this.sideTab,
        disabled: this.props.match.params.pathType === PathTypes.tree,
        'data-test-subj': 'codeStructureTreeTab',
      },
    ];
  }

  public switchTab = (tab: Tabs) => {
    const { history } = this.props;
    const { pathname, search } = history.location;
    // @ts-ignore
    history.push(QueryString.replaceParamInUrl(`${pathname}${search}`, 'tab', tab));
  };

  public render() {
    return (
      <Container>
        <EuiTabbedContent
          tabs={this.tabs}
          initialSelectedTab={this.tabs.find(t => t.id === this.sideTab)}
          onTabClick={tab => this.switchTab(tab.id as Tabs)}
          expand={true}
        />
        <Shortcut
          keyCode="t"
          help="Toggle tree and symbol view in sidebar"
          onPress={this.toggleTab}
        />
      </Container>
    );
  }
  private toggleTab = () => {
    const currentTab = this.sideTab;
    if (currentTab === Tabs.file) {
      this.switchTab(Tabs.structure);
    } else {
      this.switchTab(Tabs.file);
    }
  };
}

export const SideTabs = withRouter(CodeSideTabs);
