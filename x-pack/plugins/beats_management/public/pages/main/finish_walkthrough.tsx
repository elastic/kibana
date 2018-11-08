/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageContent } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { AppURLState } from '../../app';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
interface PageProps extends URLStateProps<AppURLState>, RouteComponentProps<any> {
  loadBeats: any;
  libs: FrontendLibs;
  intl: InjectedIntl;
}
export class FinishWalkthrough extends React.Component<PageProps, any> {
  constructor(props: PageProps) {
    super(props);

    this.state = {
      assigned: false,
    };
  }

  public componentDidMount() {
    setTimeout(async () => {
      await this.props.loadBeats();

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
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.beatsManagement.enrollBeat.nextStepTitle"
                    defaultMessage="Your Beat is enrolled. What's next?"
                  />
                </h2>
              }
              body={
                <React.Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.beatsManagement.enrollBeat.nextStepDescription"
                      defaultMessage="Start your Beat to check for configuration errors, then click Done."
                    />
                  </p>
                </React.Fragment>
              }
              actions={
                <EuiButton
                  fill
                  disabled={!this.state.assigned}
                  onClick={async () => {
                    goTo('/overview/beats');
                  }}
                >
                  <FormattedMessage
                    id="xpack.beatsManagement.enrollBeat.firstBeatEnrollingDoneButtonLabel"
                    defaultMessage="Done"
                  />
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
    const { intl } = this.props;
    if (!this.props.urlState.enrollmentToken) {
      return alert(
        intl.formatMessage({
          id: 'xpack.beatsManagement.enrollBeat.assignTagToBeatInvalidURLNoTokenFountTitle',
          defaultMessage: 'Invalid URL, no enrollmentToken found',
        })
      );
    }
    if (!this.props.urlState.createdTag) {
      return alert(
        intl.formatMessage({
          id: 'xpack.beatsManagement.enrollBeat.assignTagToBeatInvalidURLNoTagFoundTitle',
          defaultMessage: 'Invalid URL, no createdTag found',
        })
      );
    }

    const beat = await this.props.libs.beats.getBeatWithToken(this.props.urlState.enrollmentToken);
    if (!beat) {
      return alert(
        intl.formatMessage({
          id: 'xpack.beatsManagement.enrollBeat.assignTagToBeatNotEnrolledProperlyTitle',
          defaultMessage: 'Error: Beat not enrolled properly',
        })
      );
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

const FinishWalkthroughPageUi = withUrlState<PageProps>(FinishWalkthrough);

export const FinishWalkthroughPage = injectI18n(FinishWalkthroughPageUi);
