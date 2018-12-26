/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, EuiTextColor } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Repository } from 'x-pack/plugins/code/model';
import { deleteRepo, indexRepo, initRepoCommand } from '../../actions';

const Footer = styled.div``;

class CodeProjectItem extends React.PureComponent<{
  project: Repository;
  isDeleting?: boolean;
  isIndexing?: boolean;
  isCloning?: boolean;
  isAdmin: boolean;
  status: any;
  deleteRepo: (uri: string) => void;
  indexRepo: (uri: string) => void;
  initRepoCommand: (uri: string) => void;
}> {
  public render() {
    const { isDeleting, project, isIndexing, isCloning } = this.props;
    const { name, org, nextUpdateTimestamp, uri } = project;
    const onClickDelete = () => this.props.deleteRepo(uri);
    const onClickIndex = () => this.props.indexRepo(uri);
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
      <EuiPanel>
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="starEmpty" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <Link to={`/${uri}`}>
              <EuiText>
                <EuiTextColor color="subdued">{org}</EuiTextColor>/<strong>{name}</strong>
              </EuiText>
            </Link>
            <EuiText>
              <h6>
                <EuiTextColor color="subdued">{footer}</EuiTextColor>
              </h6>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiText color="subdued" size="s">
              <a href={'https://' + uri} target="_blank">
                {uri}
              </a>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <div className="code-project-button">
                  <EuiIcon type="gear" />
                  <EuiText size="xs" color="subdued">
                    Settings
                  </EuiText>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div className="code-project-button" onClick={onClickIndex} role="button">
                  <EuiIcon type="indexSettings" />
                  <EuiText size="xs" color="subdued">
                    Index
                  </EuiText>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div className="code-project-button" onClick={onClickDelete} role="button">
                  <EuiIcon type="trash" color="danger" />
                  <EuiText size="xs" color="subdued">
                    Delete
                  </EuiText>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
}

const mapDispatchToProps = {
  deleteRepo,
  indexRepo,
  initRepoCommand,
};

export const ProjectItem = connect(
  null,
  mapDispatchToProps
)(CodeProjectItem);
