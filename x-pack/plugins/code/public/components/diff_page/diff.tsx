/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  euiBorderThick,
  euiBorderThin,
  euiColorDanger,
  euiColorPrimary,
  euiColorVis0,
  euiSize,
  euiSizeS,
  euiSizeXs,
  paddingSizes,
} from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { SearchScope } from 'x-pack/plugins/code/model';
import { CommitDiff, FileDiff } from '../../../common/git_diff';
import { changeSearchScope } from '../../actions';
import { RootState } from '../../reducers';
import { SearchBar } from '../search_page/search_bar';
import { DiffEditor } from './diff_editor';

const COMMIT_ID_LENGTH = 16;

const B = styled.b`
  font-weight: bold;
`;

const PrimaryB = styled(B)`
  color: ${euiColorPrimary};
`;

const CommitId = styled.span`
  display: inline-block;
  padding: 0 ${paddingSizes.xs};
  border: ${euiBorderThin};
`;

const Addition = styled.div`
  padding: ${paddingSizes.xs} ${paddingSizes.s};
  border-radius: ${euiSizeXs};
  color: white;
  margin-right: ${euiSizeS};
  background-color: ${euiColorDanger};
`;

const Deletion = styled(Addition)`
  background-color: ${euiColorVis0};
`;

const Container = styled.div`
  padding: ${paddingSizes.xs} ${paddingSizes.m};
`;

const Accordion = styled(EuiAccordion)`
  border: ${euiBorderThick};
  border-radius: ${euiSizeS};
  margin-bottom: ${euiSize};
`;

const Icon = styled(EuiIcon)`
  margin-right: ${euiSizeS};
`;

interface Props {
  commit: CommitDiff | null;
  query: string;
  onSearchScopeChanged: (s: SearchScope) => void;
}

export enum DiffLayout {
  Unified,
  Split,
}

const Difference = (props: { fileDiff: FileDiff }) => (
  <Accordion
    initialIsOpen={true}
    id={props.fileDiff.path}
    buttonContent={
      <div>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">
              <Addition>{props.fileDiff.additions}</Addition>
              <Deletion>{props.fileDiff.deletions}</Deletion>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>{props.fileDiff.path}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s">View File</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    }
  >
    <DiffEditor
      originCode={props.fileDiff.originCode!}
      modifiedCode={props.fileDiff.modifiedCode!}
      language={props.fileDiff.language!}
      renderSideBySide={true}
    />
  </Accordion>
);

export class DiffPage extends React.Component<Props> {
  public state = {
    diffLayout: DiffLayout.Split,
  };

  public setLayoutUnified = () => {
    this.setState({ diffLayout: DiffLayout.Unified });
  };

  public setLayoutSplit = () => {
    this.setState({ diffLayout: DiffLayout.Split });
  };

  public render() {
    const { commit, parents } = this.props;
    if (!commit) {
      return null;
    }
    const { additions, deletions, files } = commit;
    const title = commit.commit.message.split('\n')[0];
    const topBar = (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <div>Parents: ${parents}</div>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
    const fileCount = files.length;
    const diffs = commit.files.map(file => <Difference fileDiff={file} key={file.path} />);
    return (
      <div>
        <SearchBar
          query={this.props.query}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
        />
        <Container>
          <EuiText>{commit.commit.message}</EuiText>
        </Container>
        <Container>
          <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiText>
                <Icon type="dataVisualizer" />
                Showing
                <PrimaryB> {fileCount} Changed files </PrimaryB>
                with
                <B> {additions} additions</B> and <B>{deletions} deletions </B>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                Committed by
                <PrimaryB> {commit.commit.author} </PrimaryB>
                <CommitId>{commit.commit.sha.substr(0, COMMIT_ID_LENGTH)}</CommitId>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Container>
        <Container>{diffs}</Container>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  commit: state.commit.commit,
  query: state.search.query,
  parents: '',
});

const mapDispatchToProps = {
  onSearchScopeChanged: changeSearchScope,
};

export const Diff = connect(
  mapStateToProps,
  mapDispatchToProps
)(DiffPage);
