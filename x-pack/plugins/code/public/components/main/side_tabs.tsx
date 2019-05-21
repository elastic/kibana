/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiSpacer, EuiTabbedContent, EuiText } from '@elastic/eui';
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

interface Props extends RouteComponentProps<MainRouteParams> {
  loadingFileTree: boolean;
  loadingStructureTree: boolean;
  hasStructure: boolean;
  languageServerInitializing: boolean;
}

class CodeSideTabs extends React.PureComponent<Props> {
  public get sideTab(): Tabs {
    const { search } = this.props.location;
    let qs = search;
    if (search.charAt(0) === '?') {
      qs = search.substr(1);
    }
    const tab = parseQuery(qs).tab;
    return tab === Tabs.structure ? Tabs.structure : Tabs.file;
  }

  public renderLoadingSpinner(text: string) {
    return (
      <div>
        <EuiSpacer size="xl" />
        <EuiSpacer size="xl" />
        <EuiText textAlign="center">{text}</EuiText>
        <EuiSpacer size="m" />
        <EuiText textAlign="center">
          <EuiLoadingSpinner size="xl" />
        </EuiText>
      </div>
    );
  }

  public get tabs() {
    const { languageServerInitializing, loadingFileTree, loadingStructureTree } = this.props;
    const fileTabContent = loadingFileTree ? (
      this.renderLoadingSpinner('Loading file tree')
    ) : (
      <div className="codeFileTree__container">{<FileTree />}</div>
    );
    let structureTabContent: React.ReactNode;
    if (languageServerInitializing) {
      structureTabContent = this.renderLoadingSpinner('Language server is initializing');
    } else if (loadingStructureTree) {
      structureTabContent = this.renderLoadingSpinner('Loading structure tree');
    } else {
      structureTabContent = <SymbolTree />;
    }
    return [
      {
        id: Tabs.file,
        name: 'File',
        content: fileTabContent,
        'data-test-subj': 'codeFileTreeTab',
      },
      {
        id: Tabs.structure,
        name: 'Structure',
        content: structureTabContent,
        disabled: this.props.match.params.pathType === PathTypes.tree || !this.props.hasStructure,
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
    const tabs = this.tabs;
    const selectedTab = tabs.find(t => t.id === this.sideTab);
    return (
      <div>
        <EuiTabbedContent
          className="code-navigation__sidebar"
          tabs={tabs}
          onTabClick={tab => this.switchTab(tab.id as Tabs)}
          expand={true}
          selectedTab={selectedTab}
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
