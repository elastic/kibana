/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';

import chrome from 'ui/chrome';
import { MainRouteParams } from '../../common/types';
import { ShortcutsProvider } from '../shortcuts';
import { Content } from './content';
import { SideTabs } from './side_tabs';
import { structureSelector } from '../../selectors';
import { RootState } from '../../reducers';

interface Props extends RouteComponentProps<MainRouteParams> {
  loadingFileTree: boolean;
  loadingStructureTree: boolean;
  hasStructure: boolean;
  languageServerInitializing: boolean;
}

class CodeMain extends React.Component<Props> {
  public componentDidMount() {
    this.setBreadcrumbs();
  }

  public componentDidUpdate() {
    chrome.breadcrumbs.pop();
    this.setBreadcrumbs();
  }

  public setBreadcrumbs() {
    const { org, repo } = this.props.match.params;
    chrome.breadcrumbs.push({ text: `${org} → ${repo}` });
  }

  public componentWillUnmount() {
    chrome.breadcrumbs.pop();
  }

  public render() {
    const {
      loadingFileTree,
      loadingStructureTree,
      hasStructure,
      languageServerInitializing,
    } = this.props;
    return (
      <div className="codeContainer__root">
        <div className="codeContainer__rootInner">
          <React.Fragment>
            <SideTabs
              loadingFileTree={loadingFileTree}
              loadingStructureTree={loadingStructureTree}
              hasStructure={hasStructure}
              languageServerInitializing={languageServerInitializing}
            />
            <Content />
          </React.Fragment>
        </div>
        <ShortcutsProvider />
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  loadingFileTree: state.file.rootFileTreeLoading,
  loadingStructureTree: state.symbol.loading,
  hasStructure: structureSelector(state).length > 0 && !state.symbol.error,
  languageServerInitializing: state.symbol.languageServerInitializing,
});

export const Main = connect(mapStateToProps)(CodeMain);
