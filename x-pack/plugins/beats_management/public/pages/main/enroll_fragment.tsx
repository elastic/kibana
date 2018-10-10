/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore typings for EuiBasicTable not present in current version
  EuiBasicTable,
  EuiButton,
  EuiLoadingSpinner,
  EuiModalBody,
} from '@elastic/eui';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { CMBeat } from '../../../common/domain_types';
import { AppURLState } from '../../app';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
interface BeatsProps extends URLStateProps<AppURLState>, RouteComponentProps<any> {
  match: any
  libs: FrontendLibs;
}
export class EnrollBeat extends React.Component<BeatsProps, any> {
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
    if(!this.props.urlState.enrollmentToken) {
      const enrollmentToken = await this.props.libs.tokens.createEnrollmentToken();
      this.props.setUrlState({
        enrollmentToken
      })
    }
  }
  public waitForToken = async (token: string) => {
    if(this.pinging) { return } 
    this.pinging = true;
    const enrolledBeat = await this.pingForBeatWithToken(this.props.libs, token) as CMBeat;

    this.setState({
      enrolledBeat
    })
    this.pinging = false
  }
  public render() {
    if(this.props.urlState.enrollmentToken && !this.state.enrolledBeat) {
      this.waitForToken(this.props.urlState.enrollmentToken)
    } 
    const {
      goTo,
    } = this.props;

    const actions = [];

    switch(this.props.location.pathname) {
      case '/overview/initial/beats':
      actions.push({
        goTo: '/overview/initial/tag',
        name: 'Continue'
      })
      break
      case '/overview/beats/enroll': 
      actions.push({
        goTo: '/overview/beats/enroll',
        name: 'Enroll another Beat',
        newToken: true
      })
      actions.push({
        goTo: '/overview/beats',
        name: 'Done',
        clearToken: true
      })
      break;
    }
  return (
    <div>
      {this.props.urlState.enrollmentToken && (
       <div>
            {!this.state.enrolledBeat && (
              <EuiModalBody style={{ textAlign: 'center' }}>
                To enroll a Beat with Centeral Management, run this command on the host that has Beats
                installed.
                <br />
                <br />
                <br />
                <div className="euiFormControlLayout euiFormControlLayout--fullWidth">
                  <div className="euiFieldText euiFieldText--fullWidth" style={{ textAlign: 'left' }}>
                    $ beats enroll {window.location.protocol}//{window.location.host}{this.props.libs.framework.baseURLPath ? `/${this.props.libs.framework.baseURLPath}` : ''} {this.props.urlState.enrollmentToken}
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
                {actions.map(action => (
                  <EuiButton
                  key={action.name}
                  size="s"
                  color="primary"
                  style={{marginLeft: 10}}
                  onClick={async () => {
                    if(action.clearToken) {
                      this.props.setUrlState({enrollmentToken: ''})
                    }

                    if(action.newToken) {
                      const enrollmentToken = await this.props.libs.tokens.createEnrollmentToken();
  
                      this.props.setUrlState({enrollmentToken});
                      return this.setState({
                        enrolledBeat: null
                      })
                    }
                    goTo(action.goTo)

                  }}
                >
                {action.name}
                </EuiButton>
                ))}
       
              </EuiModalBody>
            )}

       </div>
      )}
    </div>
  )}
}

export const EnrollBeatPage = withUrlState<BeatsProps>(EnrollBeat);
