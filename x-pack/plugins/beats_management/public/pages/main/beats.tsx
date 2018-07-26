/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
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
  public static ActionArea = ({ match, history }: { match: any; history: any }) => (
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
        onClick={() => {
          history.push('/beats/enroll/foobar');
        }}
      >
        Enroll Beats
      </EuiButton>

      {match.params.enrollmentToken != null && (
        <EuiOverlayMask>
          <EuiModal onClose={() => history.push('/beats')} style={{ width: '800px' }}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Enroll Beats</EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              Enrollment UI here for enrollment token of: {match.params.enrollmentToken}
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty onClick={() => history.push('/beats')}>Cancel</EuiButtonEmpty>
            </EuiModalFooter>
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
