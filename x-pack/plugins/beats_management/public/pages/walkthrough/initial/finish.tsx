/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageContent } from '@elastic/eui';
import React from 'react';
import { BeatTag, CMBeat } from '../../../../common/domain_types';
import { BeatsTagAssignment } from '../../../../server/lib/adapters/beats/adapter_types';
import { BeatsContainer } from '../../../containers/beats';
import { TagsContainer } from '../../../containers/tags';
import { AppPageProps } from '../../../frontend_types';

interface PageState {
  assigned: boolean;
}
export class FinishWalkthroughPage extends React.Component<AppPageProps, PageState> {
  constructor(props: AppPageProps) {
    super(props);

    this.state = {
      assigned: false,
    };
  }

  public componentDidMount() {
    setTimeout(async () => {
      const done = await this.assignTagToBeat();

      if (done) {
        this.setState({
          assigned: true,
        });
      }
    }, 300);
  }

  public render() {
    const { goTo } = this.props;

    return (
      <EuiFlexGroup justifyContent="spaceAround" style={{ marginTop: 50 }}>
        <EuiFlexItem grow={false}>
          <EuiPageContent>
            <EuiEmptyPrompt
              iconType="logoBeats"
              title={<h2>Congratulations!</h2>}
              body={
                <React.Fragment>
                  <p>
                    You have enrolled your first beat, and we have assigned your new tag with its
                    configurations to it
                  </p>
                  <h3>Next Steps</h3>
                  <p>All that is left to do is to start the beat you just enrolled.</p>
                </React.Fragment>
              }
              actions={
                <EuiButton
                  fill
                  disabled={!this.state.assigned}
                  onClick={async () => {
                    goTo('/overview/enrolled_beats');
                  }}
                >
                  Done
                </EuiButton>
              }
            />
          </EuiPageContent>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private createBeatTagAssignments = (beats: CMBeat[], tag: BeatTag): BeatsTagAssignment[] =>
    beats.map(({ id }) => ({ beatId: id, tag: tag.id }));

  private assignTagToBeat = async () => {
    if (!this.props.urlState.enrollmentToken) {
      return alert('Invalid URL, no enrollmentToken found');
    }
    if (!this.props.urlState.createdTag) {
      return alert('Invalid URL, no createdTag found');
    }

    const beat = await this.props.libs.beats.getBeatWithToken(this.props.urlState.enrollmentToken);
    if (!beat) {
      return alert('Error: Beat not enrolled properly');
    }
    const tags = await this.props.libs.tags.getTagsWithIds([this.props.urlState.createdTag]);

    const assignments = this.createBeatTagAssignments([beat], tags[0]);
    await this.props.libs.beats.assignTagsToBeats(assignments);
    this.props.setUrlState({
      createdTag: '',
      enrollmentToken: '',
    });
    return true;
  };
}
