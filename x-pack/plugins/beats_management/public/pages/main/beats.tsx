/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { CMBeat } from '../../../common/domain_types';
import { FrontendLibs } from '../../lib/lib';

import React from 'react';
interface BeatsPageProps {
  libs: FrontendLibs;
}

interface BeatsPageState {
  beats: CMBeat[];
}

export class BeatsPage extends React.PureComponent<BeatsPageProps, BeatsPageState> {
  public static ActionArea = ({
    match,
    history,
    libs,
  }: {
    match: any;
    history: any;
    libs: FrontendLibs;
  }) => (
    <div>
      <EuiButtonEmpty
        onClick={() => {
          window.alert('This will later go to more general beats install instructions.');
          window.location.href = '#/home/tutorial/dockerMetrics';
        }}
      >
        Learn how to install beats
      </EuiButtonEmpty>
      <EuiButton
        size="s"
        color="primary"
        onClick={async () => {
          const TokenObj = await libs.tokens.createEnrollmentToken();
          history.push(`/beats/enroll/${TokenObj.token}`);
        }}
      >
        Enroll Beats
      </EuiButton>

      {match.params.enrollmentToken != null && (
        <EuiOverlayMask>
          <EuiModal onClose={() => history.push('/beats')} style={{ width: '600px' }}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Enroll a new Beat</EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody style={{ textAlign: 'center' }}>
              To enroll a Beat with Centeral Management, run this command on the host that has Beats
              installed.
              <br />
              <br />
              <br />
              <div className="euiFormControlLayout euiFormControlLayout--fullWidth">
                <div className="euiFieldText euiFieldText--fullWidth" style={{ textAlign: 'left' }}>
                  $ beats enroll {window.location.protocol}//{window.location.host} {match.params.enrollmentToken}
                </div>
              </div>
              <br />
              <br />
              <EuiLoadingSpinner size="l" />
              <br />
              <br />
              Waiting for enroll command to be run...
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </div>
  );
  constructor(props: BeatsPageProps) {
    super(props);

    this.state = {
      beats: [],
    };

    this.loadBeats();
  }
  public render() {
    return <div>beats table and stuff - {this.state.beats.length}</div>;
  }
  private async loadBeats() {
    const beats = await this.props.libs.beats.getAll();
    this.setState({
      beats,
    });
  }
}
