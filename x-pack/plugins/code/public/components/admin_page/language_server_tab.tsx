/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { LanguageServer, LanguageServerStatus } from '../../../common/language_server';
import { requestInstallLanguageServer } from '../../actions/language_server';
import { RootState } from '../../reducers';
import { JavaIcon, TypeScriptIcon } from '../shared/icons';
const JAVA_URL =
  'https://download.elasticsearch.org/code/java-langserver/snapshot/java_languageserver-1.0.0-SNAPSHOT-darwin.zip';

const LanguageServerState = styled(EuiTextColor)`
  color: ${props => props.color};
`;

const LanguageServerLi = (props: {
  languageServer: LanguageServer;
  requestInstallLanguageServer: (l: string) => void;
  loading: boolean;
}) => {
  const { status, name } = props.languageServer;

  const languageIcon = () => {
    if (name === 'Typescript') {
      return <TypeScriptIcon />;
    } else if (name === 'Java') {
      return <JavaIcon />;
    }
  };

  const onInstallClick = () => props.requestInstallLanguageServer(name);
  let button = null;
  let state = null;
  if (status === LanguageServerStatus.RUNNING) {
    state = <LanguageServerState>Running ...</LanguageServerState>;
    button = (
      <EuiButton size="s" color="secondary" onClick={onInstallClick}>
        Re-install
      </EuiButton>
    );
  } else if (status === LanguageServerStatus.NOT_INSTALLED) {
    state = <LanguageServerState color={'subdued'}>Not Installed</LanguageServerState>;
    button = props.loading ? (
      <EuiButton size="s" color="secondary">
        <EuiLoadingSpinner size="s" />
        Installing
      </EuiButton>
    ) : (
      <EuiButton size="s" color="secondary" onClick={onInstallClick}>
        Install
      </EuiButton>
    );
  } else if (status === LanguageServerStatus.READY) {
    state = <LanguageServerState color={'subdued'}>Installed</LanguageServerState>;
  }
  return (
    <EuiFlexItem>
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}> {languageIcon()} </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <strong>{name}</strong>
                </EuiText>
                <EuiText size="s">
                  <h6> {state} </h6>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}> {button} </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};

interface Props {
  languageServers: LanguageServer[];
  requestInstallLanguageServer: (ls: string) => void;
  installLoading: { [ls: string]: boolean };
}
interface State {
  showingInstruction: boolean;
  name?: string;
  url?: string;
}

class AdminLanguageSever extends React.PureComponent<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = { showingInstruction: false };
  }

  public toggleInstruction = (showingInstruction: boolean, name?: string, url?: string) => {
    this.setState({ showingInstruction, name, url });
  };

  public render() {
    const languageServers = this.props.languageServers.map(ls => (
      <LanguageServerLi
        languageServer={ls}
        key={ls.name}
        requestInstallLanguageServer={
          () =>
            this.toggleInstruction(
              true,
              ls.name,
              JAVA_URL
            ) /*this.props.requestInstallLanguageServer*/
        }
        loading={this.props.installLoading[ls.name]}
      />
    ));
    return (
      <div>
        <EuiSpacer />
        <EuiText>
          <h3>
            {this.props.languageServers.length}
            {this.props.languageServers.length > 1 ? (
              <span> Language Servers</span>
            ) : (
              <span> Language Server</span>
            )}
          </h3>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup direction="column" gutterSize="s">
          {languageServers}
        </EuiFlexGroup>
        <LanguageServerInstruction
          show={this.state.showingInstruction}
          name={this.state.name!}
          url={this.state.url!}
          close={() => this.toggleInstruction(false)}
        />
      </div>
    );
  }
}

const LanguageServerInstruction = (props: {
  name: string;
  url: string;
  show: boolean;
  close: () => void;
}) => {
  return (
    <React.Fragment>
      {' '}
      {props.show && (
        <EuiOverlayMask>
          <EuiModal onClose={props.close}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Install Instruction</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiText grow={false}>
                <h3>Download</h3>
                <p>
                  Download {props.name} language server plugin from
                  <EuiLink href={props.url}> here.</EuiLink>
                </p>
                <h3>Install</h3>
                <p>
                  Stop your kibana code node. Install it using kibana-plugin command.
                  <pre>
                    <code>bin/kibana-plugin install {JAVA_URL}</code>
                  </pre>
                </p>
              </EuiText>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={props.close} fill>
                Close
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </React.Fragment>
  );
};

const mapStateToProps = (state: RootState) => ({
  languageServers: state.languageServer.languageServers,
  installLoading: state.languageServer.installServerLoading,
});

const mapDispatchToProps = {
  requestInstallLanguageServer,
};

export const LanguageSeverTab = connect(
  mapStateToProps,
  mapDispatchToProps
)(AdminLanguageSever);
