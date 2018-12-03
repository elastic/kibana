/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore typings for EuiBasicTable not present in current version
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModalBody,
  // @ts-ignore
  EuiSelect,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { capitalize } from 'lodash';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { CMBeat } from '../../../common/domain_types';
import { AppURLState } from '../../app';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';

interface BeatsProps extends URLStateProps<AppURLState>, RouteComponentProps<any> {
  match: any;
  libs: FrontendLibs;
  intl: InjectedIntl;
}
export class EnrollBeat extends React.Component<BeatsProps, any> {
  private pinging = false;
  constructor(props: BeatsProps) {
    super(props);

    this.state = {
      enrolledBeat: null,
      command: 'sudo filebeat',
      beatType: 'filebeat',
    };
  }
  public pingForBeatWithToken = async (
    libs: FrontendLibs,
    token: string
  ): Promise<CMBeat | void> => {
    try {
      const beats = await libs.beats.getBeatWithToken(token);
      if (!beats) {
        throw new Error('no beats');
      }
      return beats;
    } catch (err) {
      if (this.pinging) {
        const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
        await timeout(5000);
        return await this.pingForBeatWithToken(libs, token);
      }
    }
  };
  public async componentDidMount() {
    if (!this.props.urlState.enrollmentToken) {
      const enrollmentToken = await this.props.libs.tokens.createEnrollmentToken();
      this.props.setUrlState({
        enrollmentToken,
      });
    }
  }
  public waitForToken = async (token: string) => {
    if (this.pinging) {
      return;
    }
    this.pinging = true;
    const enrolledBeat = (await this.pingForBeatWithToken(this.props.libs, token)) as CMBeat;

    this.setState({
      enrolledBeat,
    });
    this.pinging = false;
  };
  public render() {
    if (!this.props.urlState.enrollmentToken) {
      return null;
    }
    if (this.props.urlState.enrollmentToken && !this.state.enrolledBeat) {
      this.waitForToken(this.props.urlState.enrollmentToken);
    }
    const { goTo, intl } = this.props;

    const actions = [];

    switch (this.props.location.pathname) {
      case '/overview/initial/beats':
        actions.push({
          goTo: '/overview/initial/tag',
          name: intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.continueButtonLabel',
            defaultMessage: 'Continue',
          }),
        });
        break;
      case '/overview/beats/enroll':
        actions.push({
          goTo: '/overview/beats/enroll',
          name: intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.enrollAnotherBeatButtonLabel',
            defaultMessage: 'Enroll another Beat',
          }),
          newToken: true,
        });
        actions.push({
          goTo: '/overview/beats',
          name: intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.doneButtonLabel',
            defaultMessage: 'Done',
          }),
          clearToken: true,
        });
        break;
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
                      <h3>
                        <FormattedMessage
                          id="xpack.beatsManagement.enrollBeat.beatTypeTitle"
                          defaultMessage="Beat type:"
                        />
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSelect
                  value={this.state.beatType}
                  options={[
                    {
                      value: 'filebeat',
                      text: 'Filebeat',
                    },
                    {
                      value: 'metricbeat',
                      text: 'Metricbeat',
                    },
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
                      <h3>
                        <FormattedMessage
                          id="xpack.beatsManagement.enrollBeat.platformTitle"
                          defaultMessage="Platform:"
                        />
                      </h3>
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
                          <FormattedMessage
                            id="xpack.beatsManagement.enrollBeat.yourBeatTypeHostTitle"
                            defaultMessage="On the host where your {beatType} is installed, run:"
                            values={{
                              beatType: capitalize(this.state.beatType),
                            }}
                          />
                        </h3>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <div className="euiFormControlLayout euiFormControlLayout--fullWidth">
                    <div
                      className="euiFieldText euiFieldText--fullWidth"
                      style={{ textAlign: 'left' }}
                    >
                      <FormattedMessage
                        id="xpack.beatsManagement.enrollBeat.stateCommandEnrollLocationProtocolTitle"
                        defaultMessage="$ {stateCommand} enroll {locationProtocol}"
                        values={{
                          stateCommand: this.state.command,
                          locationProtocol: window.location.protocol,
                        }}
                      />
                      {`//`}
                      {window.location.host}
                      {this.props.libs.framework.baseURLPath
                        ? this.props.libs.framework.baseURLPath
                        : ''}{' '}
                      {this.props.urlState.enrollmentToken}
                    </div>
                  </div>
                  <br />
                  <br />
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="s" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="xs">
                            <h3>
                              <FormattedMessage
                                id="xpack.beatsManagement.enrollBeat.waitingBeatTypeToEnrollTitle"
                                defaultMessage="Waiting for {beatType} to enroll…"
                                values={{
                                  beatType: capitalize(this.state.beatType),
                                }}
                              />
                            </h3>
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
            <FormattedMessage
              id="xpack.beatsManagement.enrollBeat.beatEnrolledTitle"
              defaultMessage="The Beat is now enrolled in central management:"
            />
            <br />
            <br />
            <br />
            <EuiBasicTable
              items={[this.state.enrolledBeat]}
              columns={[
                {
                  field: 'type',
                  name: (
                    <FormattedMessage
                      id="xpack.beatsManagement.enrollBeat.beatTypeColumnName"
                      defaultMessage="Beat Type"
                    />
                  ),
                  sortable: false,
                },
                {
                  field: 'version',
                  name: (
                    <FormattedMessage
                      id="xpack.beatsManagement.enrollBeat.versionColumnName"
                      defaultMessage="Version"
                    />
                  ),
                  sortable: false,
                },
                {
                  field: 'host_name',
                  name: (
                    <FormattedMessage
                      id="xpack.beatsManagement.enrollBeat.hostnameColumnName"
                      defaultMessage="Hostname"
                    />
                  ),
                  sortable: false,
                },
              ]}
            />
            <br />
            <br />
            {actions.map(action => (
              <EuiButton
                key={action.name}
                size="s"
                color="primary"
                style={{ marginLeft: 10 }}
                onClick={async () => {
                  if (action.clearToken) {
                    this.props.setUrlState({ enrollmentToken: '' });
                  }

                  if (action.newToken) {
                    const enrollmentToken = await this.props.libs.tokens.createEnrollmentToken();

                    this.props.setUrlState({ enrollmentToken });
                    return this.setState({
                      enrolledBeat: null,
                    });
                  }
                  goTo(action.goTo);
                }}
              >
                {action.name}
              </EuiButton>
            ))}
          </EuiModalBody>
        )}
      </React.Fragment>
    );
  }
}

export const EnrollBeatPageUi = withUrlState<BeatsProps>(EnrollBeat);

export const EnrollBeatPage = injectI18n(EnrollBeatPageUi);
