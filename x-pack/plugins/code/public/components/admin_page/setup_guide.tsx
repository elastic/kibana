/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiGlobalToastList,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { documentationLinks } from '../../lib/documentation_links';
import { RootState } from '../../reducers';

const steps = [
  {
    title: 'Check if multiple Kibana instances are used as a cluster',
    children: (
      <EuiText>
        <p>If you are using single Kibana instance, you can skip this step.</p>
        <p>
          If you are using multiple Kibana instances, you need to assign one Kibana instance as
          `Code node`. To do this, add the following line of code into your kibana.yml file of every
          Kibana instance and restart the instances:
        </p>
        <pre>
          <code>xpack.code.codeNodeUrl: 'http://$YourCodeNodeAddress'</code>
        </pre>
        <p>
          Where `$YourCodeNoteAddress` is the URL of your assigned Code node accessible by other
          Kibana instances.
        </p>
      </EuiText>
    ),
  },
  {
    title: 'Install extra language support optionally',
    children: (
      <EuiText>
        <p>
          Look{' '}
          <EuiLink href={documentationLinks.codeInstallLangServer} target="_blank">
            here
          </EuiLink>{' '}
          to learn more about supported languages and language server installation.
        </p>
        <p>
          If you need Java language support, you can manage language server installation{' '}
          <Link to="/admin?tab=LanguageServers">here</Link>
        </p>
      </EuiText>
    ),
  },
  {
    title: 'Add a repository to Code',
    children: (
      <EuiText>
        <p>
          Import{' '}
          <EuiLink href={documentationLinks.codeGettingStarted} target="_blank">
            {' '}
            a sample repo
          </EuiLink>{' '}
          or{' '}
          <EuiLink href={documentationLinks.codeRepoManagement} target="_blank">
            your own repo
          </EuiLink>
          . It is as easy as copy and paste git clone URLs to Code.
        </p>
      </EuiText>
    ),
  },
  {
    title: 'Verify the repo is successfully imported',
    children: (
      <EuiText>
        <p>
          You can verify your repo is successfully imported by{' '}
          <EuiLink href={documentationLinks.codeSearch} target="_blank">
            searching
          </EuiLink>{' '}
          and{' '}
          <EuiLink href={documentationLinks.codeOtherFeatures} target="_blank">
            navigating
          </EuiLink>{' '}
          the repo. If language support is available to the repo, make sure{' '}
          <EuiLink href={documentationLinks.semanticNavigation} target="_blank">
            semantic navigation
          </EuiLink>{' '}
          is available as well.
        </p>
      </EuiText>
    ),
  },
];

const toastMessage = (
  <div>
    <p>
      We’ve made some changes to roles and permissions in Kibana. Read more about what these changes
      mean for you below.{' '}
    </p>
    <EuiButton size="s" href={documentationLinks.kibanaRoleManagement}>
      Learn more
    </EuiButton>
  </div>
);

class SetupGuidePage extends React.PureComponent<{ setupOk?: boolean }, { hideToast: boolean }> {
  constructor(props: { setupOk?: boolean }) {
    super(props);

    this.state = {
      hideToast: false,
    };
  }

  public render() {
    let setup = null;
    if (this.props.setupOk !== undefined) {
      setup = (
        <div>
          {!this.state.hideToast && (
            <EuiGlobalToastList
              toasts={[
                {
                  title: 'Permission Changes',
                  color: 'primary',
                  iconType: 'iInCircle',
                  text: toastMessage,
                  id: '',
                },
              ]}
              dismissToast={() => {
                this.setState({ hideToast: true });
              }}
              toastLifeTimeMs={10000}
            />
          )}
          <React.Fragment>
            {this.props.setupOk === false && (
              <EuiCallOut title="Code instance not found." color="danger" iconType="cross">
                <p>
                  Please follow the guide below to configure your Kibana instance. Once configured,
                  refresh this page.
                </p>
              </EuiCallOut>
            )}
            {this.props.setupOk === true && (
              <React.Fragment>
                <EuiSpacer size="s" />
                <EuiButton iconType="sortLeft">
                  <Link to="/admin">Back To project dashboard</Link>
                </EuiButton>
                <EuiSpacer size="s" />
              </React.Fragment>
            )}
            <EuiPanel>
              <EuiTitle>
                <h3>Getting started in Elastic Code</h3>
              </EuiTitle>
              <EuiSpacer />
              <EuiSteps steps={steps} />
            </EuiPanel>
          </React.Fragment>
        </div>
      );
    }
    return <div className="codeContainer__setup">{setup}</div>;
  }
}

const mapStateToProps = (state: RootState) => ({
  setupOk: state.setup.ok,
});

export const SetupGuide = connect(mapStateToProps)(SetupGuidePage);
