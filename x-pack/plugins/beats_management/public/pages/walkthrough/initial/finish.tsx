/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageContent } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { CMBeat } from '../../../../common/domain_types';
import { AppPageProps } from '../../../frontend_types';

interface PageState {
  assigned: boolean;
}
class FinishWalkthrough extends React.Component<
  AppPageProps & {
    intl: InjectedIntl;
  },
  PageState
> {
  constructor(
    props: AppPageProps & {
      intl: InjectedIntl;
    }
  ) {
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
      <EuiFlexGroup justifyContent="spaceAround">
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
                    goTo('/overview/enrolled_beats');
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

    await this.props.containers.beats.assignTagsToBeats(
      [beat as CMBeat],
      this.props.urlState.createdTag
    );
    this.props.setUrlState({
      createdTag: '',
      enrollmentToken: '',
    });
    return true;
  };
}

export const FinishWalkthroughPage = injectI18n(FinishWalkthrough);
