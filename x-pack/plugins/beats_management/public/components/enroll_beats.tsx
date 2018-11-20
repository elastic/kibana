/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore typings for EuiBasicTable not present in current version
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModalBody,
  // @ts-ignore
  EuiSelect,
  EuiTitle,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import React from 'react';
import { CMBeat } from '../../common/domain_types';

interface ComponentProps {
  /** Such as kibanas basePath, for use to generate command */
  frameworkBasePath?: string;
  enrollmentToken: string;
  getBeatWithToken(token: string): Promise<CMBeat | null>;
  createEnrollmentToken(): Promise<void>;
  onBeatEnrolled(enrolledBeat: CMBeat): void;
}

interface ComponentState {
  enrolledBeat: CMBeat | null;
  hasPolledForBeat: boolean;
  command: string;
  beatType: string;
}

export class EnrollBeat extends React.Component<ComponentProps, ComponentState> {
  private pinging = false;
  constructor(props: ComponentProps) {
    super(props);

    this.state = {
      enrolledBeat: null,
      hasPolledForBeat: false,
      command: 'sudo filebeat',
      beatType: 'filebeat',
    };
  }
  public pingForBeatWithToken = async (token: string): Promise<CMBeat | void> => {
    try {
      const beats = await this.props.getBeatWithToken(token);
      if (!beats) {
        throw new Error('no beats');
      }
      return beats;
    } catch (err) {
      if (this.pinging) {
        const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
        await timeout(5000);
        return await this.pingForBeatWithToken(token);
      }
    }
  };
  public async componentDidMount() {
    if (!this.props.enrollmentToken) {
      await this.props.createEnrollmentToken();
    }
  }
  public waitForTokenToEnrollBeat = async () => {
    if (this.pinging) {
      return;
    }
    this.pinging = true;
    const enrolledBeat = (await this.pingForBeatWithToken(this.props.enrollmentToken)) as CMBeat;

    this.setState({
      enrolledBeat,
    });
    this.props.onBeatEnrolled(enrolledBeat);
    this.pinging = false;
  };
  public render() {
    if (!this.props.enrollmentToken) {
      return null;
    }
    if (this.props.enrollmentToken && !this.state.enrolledBeat) {
      this.waitForTokenToEnrollBeat();
    }

    return (
      <React.Fragment>
        {!this.state.enrolledBeat && (
          <React.Fragment>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>Beat type:</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSelect
                  value={this.state.beatType}
                  options={[
                    { value: 'filebeat', text: 'Filebeat' },
                    { value: 'metricbeat', text: 'Metricbeat' },
                  ]}
                  onChange={(e: any) => this.setState({ beatType: e.target.value })}
                  fullWidth={true}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <br />
            <br />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>Platform:</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSelect
                  value={this.state.command}
                  options={[
                    {
                      value: `sudo ${this.state.beatType}`,
                      text: 'DEB / RPM',
                    },
                    {
                      value: `PS C:\\Program Files\\${capitalize(this.state.beatType)}> ${
                        this.state.beatType
                      }.exe`,
                      text: 'Windows',
                    },
                    {
                      value: `./${this.state.beatType}`,
                      text: 'MacOS',
                    },
                  ]}
                  onChange={(e: any) => this.setState({ command: e.target.value })}
                  fullWidth={true}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <br />
            <br />
            {this.state.command && (
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h3>
                          On the host where your {capitalize(this.state.beatType)} is installed,
                          run:
                        </h3>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <div className="euiFormControlLayout euiFormControlLayout--fullWidth">
                    <div
                      className="euiFieldText euiFieldText--fullWidth"
                      style={{ textAlign: 'left' }}
                    >
                      $ {this.state.command} enroll {window.location.protocol}
                      {`//`}
                      {window.location.host}
                      {this.props.frameworkBasePath} {this.props.enrollmentToken}
                    </div>
                  </div>
                  <br />
                  <br />
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="s" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="xs">
                            <h3>Waiting for {capitalize(this.state.beatType)} to enroll...</h3>
                          </EuiTitle>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <br />
                  <EuiLoadingSpinner size="l" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </React.Fragment>
        )}
        {this.state.enrolledBeat && (
          <EuiModalBody>
            The Beat is now enrolled in central management:
            <br />
            <br />
            <br />
            <EuiBasicTable
              items={[this.state.enrolledBeat]}
              columns={[
                {
                  field: 'type',
                  name: 'Beat Type',
                  sortable: false,
                },
                {
                  field: 'version',
                  name: 'Version',
                  sortable: false,
                },
                {
                  field: 'host_name',
                  name: 'Hostname',
                  sortable: false,
                },
              ]}
            />
            <br />
            <br />
          </EuiModalBody>
        )}
      </React.Fragment>
    );
  }
}
