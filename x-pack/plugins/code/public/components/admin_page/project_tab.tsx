/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiButton, EuiModal, EuiSearchBar, EuiSelect } from '@elastic/eui';
import { any } from 'joi';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Repository } from 'x-pack/plugins/code/model';
import { RootState } from '../../reducers';
import { ImportProject } from './import_project';
import { ProjectItem } from './project_item';

const Root = styled.div``;
const Header = styled.div``;
const H2 = styled.h2``;

class CodeProjectTab extends React.PureComponent<
  { projects: Repository[]; status: any; isAdmin: boolean },
  { showImportProjectModal: boolean }
> {
  public state = {
    showImportProjectModal: false,
  };

  public closeModal = () => {
    this.setState({ showImportProjectModal: false });
  };

  public render() {
    const { projects, isAdmin } = this.props;
    const projectsCount = projects.length;
    const modal = this.state.showImportProjectModal && (
      <EuiModal onClose={this.closeModal}>
        <ImportProject />
      </EuiModal>
    );

    const repoList = projects.map(repo => (
      <ProjectItem key={repo.uri} project={repo} status={status[repo.uri]} isAdmin={isAdmin} />
    ));

    return (
      <Root>
        <Header>
          <EuiSelect />
          <EuiSelect />
          <EuiSearchBar />
          <EuiButton>Add New Project</EuiButton>
        </Header>
        <H2>{projectsCount}Project(s)</H2>
        {repoList}
        {modal}
      </Root>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  projects: state.repository.repositories,
  status: state.status.status,
  isAdmin: state.userConfig.isAdmin,
});

const mapDispatchToProps = {};

export const ProjectTab = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeProjectTab);
