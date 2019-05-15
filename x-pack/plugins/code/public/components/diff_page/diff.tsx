/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { MouseEvent } from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { CommitDiff, FileDiff } from '../../../common/git_diff';
import { SearchScope } from '../../../model';
import { changeSearchScope } from '../../actions';
import { RootState } from '../../reducers';
// import { SearchBar } from '../search_bar';
import { DiffEditor } from './diff_editor';

const COMMIT_ID_LENGTH = 16;

const B = styled.b`
  font-weight: bold;
`;

const PrimaryB = styled(B)`
  color: ${theme.euiColorPrimary};
`;

const CommitId = styled.span`
  display: inline-block;
  padding: 0 ${theme.paddingSizes.xs};
  border: ${theme.euiBorderThin};
`;

const Addition = styled.div`
  padding: ${theme.paddingSizes.xs} ${theme.paddingSizes.s};
  border-radius: ${theme.euiSizeXS};
  color: white;
  margin-right: ${theme.euiSizeS};
  background-color: ${theme.euiColorDanger};
`;

const Deletion = styled(Addition)`
  background-color: ${theme.euiColorVis0};
`;

const Container = styled.div`
  padding: ${theme.paddingSizes.xs} ${theme.paddingSizes.m};
`;

const TopBarContainer = styled.div`
  height: calc(48rem / 14);
  border-bottom: ${theme.euiBorderThin};
  padding: 0 ${theme.paddingSizes.m};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const Accordion = styled(EuiAccordion)`
  border: ${theme.euiBorderThick};
  border-radius: ${theme.euiSizeS};
  margin-bottom: ${theme.euiSize};
`;

const Icon = styled(EuiIcon)`
  margin-right: ${theme.euiSizeS};
`;

const Parents = styled.div`
  border-left: ${theme.euiBorderThin};
  height: calc(32rem / 14);
  line-height: calc(32rem / 14);
  padding-left: ${theme.paddingSizes.s};
  margin: ${theme.euiSizeS} 0;
`;

const H4 = styled.h4`
  height: 100%;
  line-height: calc(48rem / 14);
`;

const ButtonContainer = styled.div`
  cursor: default;
`;

interface Props extends RouteComponentProps<{ resource: string; org: string; repo: string }> {
  commit: CommitDiff | null;
  query: string;
  onSearchScopeChanged: (s: SearchScope) => void;
  repoScope: string[];
}

export enum DiffLayout {
  Unified,
  Split,
}

const onClick = (e: MouseEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
};

const Difference = (props: { fileDiff: FileDiff; repoUri: string; revision: string }) => (
  <Accordion
    initialIsOpen={true}
    id={props.fileDiff.path}
    buttonContent={
      <ButtonContainer role="button" onClick={onClick}>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">
              <Addition>{props.fileDiff.additions}</Addition>
              <Deletion>{props.fileDiff.deletions}</Deletion>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>{props.fileDiff.path}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div className="euiButton euiButton--primary euiButton--small" role="button">
              <span className="euiButton__content">
                <Link to={`/${props.repoUri}/blob/${props.revision}/${props.fileDiff.path}`}>
                  View File
                </Link>
              </span>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ButtonContainer>
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
    const { commit, match } = this.props;
    const { repo, org, resource } = match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    if (!commit) {
      return null;
    }
    const { additions, deletions, files } = commit;
    const { parents } = commit.commit;
    const title = commit.commit.message.split('\n')[0];
    let parentsLinks = null;
    if (parents.length > 1) {
      const [p1, p2] = parents;
      parentsLinks = (
        <React.Fragment>
          <Link to={`/${repoUri}/commit/${p1}`}>{p1}</Link>+
          <Link to={`/${repoUri}/commit/${p2}`}>{p2}</Link>
        </React.Fragment>
      );
    } else if (parents.length === 1) {
      parentsLinks = <Link to={`/${repoUri}/commit/${parents[0]}`}>{parents[0]}</Link>;
    }
    const topBar = (
      <TopBarContainer>
        <div>
          <EuiTitle size="xs">
            <H4>{title}</H4>
          </EuiTitle>
        </div>
        <div>
          <Parents>Parents: {parentsLinks}</Parents>
        </div>
      </TopBarContainer>
    );
    const fileCount = files.length;
    const diffs = commit.files.map(file => (
      <Difference repoUri={repoUri} revision={commit.commit.id} fileDiff={file} key={file.path} />
    ));
    return (
      <div className="diff">
        {/* <SearchBar
          repoScope={this.props.repoScope}
          query={this.props.query}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
        /> */}
        {topBar}
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
                <PrimaryB> {commit.commit.committer} </PrimaryB>
                <CommitId>{commit.commit.id.substr(0, COMMIT_ID_LENGTH)}</CommitId>
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
  repoScope: state.search.searchOptions.repoScope.map(r => r.uri),
});

const mapDispatchToProps = {
  onSearchScopeChanged: changeSearchScope,
};

export const Diff = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(DiffPage)
);
