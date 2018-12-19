/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Repository } from 'x-pack/plugins/code/model';
import { deleteRepo, importRepo, indexRepo, initRepoCommand } from '../../actions';
import { RootState } from '../../reducers';

const Root = styled.div``;
const Footer = styled.div``;
const ProjectURI = styled.div``;
const Actions = styled.div``;
const Action = styled.div``;
const Caption = styled.div``;

class CodeProjectItem extends React.PureComponent<{
  project: Repository;
  isDeleting?: boolean;
  isIndexing?: boolean;
  isCloning?: boolean;
  isAdmin: boolean;
  status: any;
  deleteRepo: (uri: string) => void;
  indexRepo: (uri: string) => void;
  importRepo: (uri: string) => void;
  initRepoCommand: (uri: string) => void;
}> {
  public render() {
    const { isDeleting, project, isIndexing, isCloning } = this.props;
    const { name, org, nextUpdateTimestamp, uri } = project;
    let footer = null;
    if (isDeleting) {
      footer = <Footer>DELETING...</Footer>;
    } else if (isIndexing) {
      footer = <Footer>INDEXING...</Footer>;
    } else if (isCloning) {
      footer = <Footer />;
    } else {
      footer = <Footer>LAST UPDATED: {moment(nextUpdateTimestamp).fromNow()}</Footer>;
    }
    return (
      <Root>
        <EuiIcon type="starEmpty" />
        <div>
          <div>
            {org}/{name}
          </div>
          {footer}
        </div>
        <ProjectURI>{uri}</ProjectURI>
        <Actions>
          <Action>
            <EuiIcon type="gear" />
            <Caption>Settings</Caption>
          </Action>
          <Action>
            <EuiIcon type="indexSettings" />
            <Caption>Index</Caption>
          </Action>
          <Action>
            <EuiIcon type="trash" />
            <Caption>Delete</Caption>
          </Action>
        </Actions>
      </Root>
    );
  }
}

const mapStateToProps = (state: RootState) => ({});

const mapDispatchToProps = {
  deleteRepo,
  importRepo,
  indexRepo,
  initRepoCommand,
};

export const ProjectItem = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeProjectItem);
