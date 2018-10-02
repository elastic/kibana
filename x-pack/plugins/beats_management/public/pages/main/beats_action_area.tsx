/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore typings for EuiBasicTable not present in current version
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask
} from '@elastic/eui';
import React from 'react';
import { CMBeat } from '../../../common/domain_types';
import { AppURLState } from '../../app';
import { URLStateProps } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
interface BeatsProps extends URLStateProps<AppURLState> {
  match: any
  libs: FrontendLibs;
}
export class BeatsActionArea extends React.Component<BeatsProps, any> {
  private pinging = false
  constructor(props: BeatsProps) {
    super(props)

    this.state = {
      enrolledBeat: null
    }
  }
  public pingForBeatWithToken = async(libs: FrontendLibs,token: string): Promise<CMBeat | void> => {  
    try {
        const beats = await libs.beats.getBeatWithToken(token);
        if(!beats) { throw new Error('no beats') }
        return beats;
    } catch(err) {
      if(this.pinging) {
        const timeout = (ms:number) => new Promise(res => setTimeout(res, ms))
        await timeout(5000)
        return await this.pingForBeatWithToken(libs, token);
      }
    }
  }
  public async componentDidMount() {
    if(this.props.match.params.enrollmentToken) {
      this.waitForToken(this.props.match.params.enrollmentToken)
    }
  }
  public waitForToken = async (token: string) => {
    this.pinging = true;
    const enrolledBeat = await this.pingForBeatWithToken(this.props.libs, token) as CMBeat;
    this.setState({
      enrolledBeat
    })
    this.pinging = false
  }
  public render() {

    const {
      match,
      goTo,
      libs,
    } = this.props;
  return (
    <div>
      <EuiButtonEmpty
        onClick={() => {
          // random, but spacific number ensures new tab does not overwrite another _newtab in chrome
          // and at the same time not truly random so that many clicks of the link open many tabs at this same URL
          window.open('https://www.elastic.co/guide/en/beats/libbeat/current/getting-started.html','_newtab35628937456');
        }}
      >
        Learn how to install beats
      </EuiButtonEmpty>
      <EuiButton
        size="s"
        color="primary"
        onClick={async () => {
          const token = await libs.tokens.createEnrollmentToken();
          this.props.goTo(`/overview/beats/enroll/${token}`);
          this.waitForToken(token);
        }}
      >
        Enroll Beats
      </EuiButton>

      {match.params.enrollmentToken != null && (
        <EuiOverlayMask>
          <EuiModal onClose={() => { 
            this.pinging = false; 
            this.setState({
              enrolledBeat: null
            }, () => goTo(`/overview/beats`))
          }} style={{ width: '640px' }}>
            <EuiModalHeader>
            <EuiModalHeaderTitle>Enroll a new Beat</EuiModalHeaderTitle>
            </EuiModalHeader>
            {!this.state.enrolledBeat && (
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
            )}
            {this.state.enrolledBeat && (
              <EuiModalBody style={{ textAlign: 'center' }}>
                A Beat was enrolled with the following data:
                <br />
                <br />
                <br />
                <EuiBasicTable
                  items={[this.state.enrolledBeat]}
                  columns={[{
                    field: 'type',
                    name: 'Beat Type',
                    sortable: false,
                  }, {
                    field: 'version',
                    name: 'Version',
                    sortable: false,
                  },{
                    field: 'host_name',
                    name: 'Hostname',
                    sortable: false,
                  }]}
                />
                <br />
                <br />
                <EuiButton
                  size="s"
                  color="primary"
                  onClick={async () => {
                    this.setState({
                      enrolledBeat: null
                    })
                    const token = await libs.tokens.createEnrollmentToken();
                    goTo(`/overview/beats/enroll/${token}`)
                    this.waitForToken(token);
                  }}
                >
                Enroll Another Beat
                </EuiButton>
              </EuiModalBody>
            )}

          </EuiModal>
        </EuiOverlayMask>
      )}
    </div>
  )}
}