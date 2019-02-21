/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent } from '@elastic/eui';
import { parse as parseQuery } from 'querystring';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { QueryString } from 'ui/utils/query_string';
import { MainRouteParams, PathTypes } from '../../common/types';
import { FileTree } from '../file_tree/file_tree';
import { Shortcut } from '../shortcuts';
import { SymbolTree } from '../symbol_tree/symbol_tree';

enum Tabs {
  file = 'file',
  structure = 'structure',
}

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
          <div className="codeFileTree--container">
            <FileTree />
          </div>
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
      <div className="code-navigation__sidebar">
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
      </div>
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
