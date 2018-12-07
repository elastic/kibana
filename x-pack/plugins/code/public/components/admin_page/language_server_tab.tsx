/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { LanguageServer, LanguageServerStatus } from '../../../common/language_server';
import { installLanguageServer } from '../../actions/language_server';
import { RootState } from '../../reducers';
import { colors } from '../../style/variables';

const Root = styled.div`
  flex-shrink: 1;
  flex-grow: 1;
`;

const Button = styled.button`
  height: 24px;
  color: ${props => props.color};
  font-size: 12.25px;
  font-family: SFProText-Regular;
  font-weight: normal;
  text-align: center;
  line-height: 16px;
  width: 120px;
  background: rgba(255, 255, 255, 0);
  border: 1px solid ${props => props.color};
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  margin-right: 9px;
  &:last-child {
    margin-right: 0;
  }
`;

const Language = styled.span`
  display: inline-block;
  font-size: 1rem;
  color: #3f3f3f;
  font-family: SFProText-Regular;
  width: 200px;
`;

const LanguageServerState = styled(Language)`
  border: none;
  color: ${props => props.color};
`;

const Li = styled.li`
  display: flex;
  flex-direction: row;
  height: 64px;
  box-shadow: inset 0 -1px 0 0 #d9d9d9;
  border: 1px solid ${colors.borderGrey};
  margin-bottom: 8px;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
`;

const LanguageServerLi = (props: {
  languageServer: LanguageServer;
  installLanguageServer: (l: string) => void;
}) => {
  const { status, name } = props.languageServer;
  const onInstallClick = () => props.installLanguageServer(name);
  let button = null;
  let state = null;
  if (status === LanguageServerStatus.RUNNING) {
    state = <LanguageServerState color={'#0079A5'}>Running ...</LanguageServerState>;
    button = (
      <Button color={'#00B3A4'} onClick={onInstallClick}>
        Re-install
      </Button>
    );
  } else if (status === LanguageServerStatus.NOT_INSTALLED) {
    state = <LanguageServerState color={'#3A3A3A'}>Not Installed</LanguageServerState>;
    button = (
      <Button color={'#00B3A4'} onClick={onInstallClick}>
        Install
      </Button>
    );
  } else if (status === LanguageServerStatus.READY) {
    state = <LanguageServerState color={'#3A3A3A'}>Installed</LanguageServerState>;
  }
  return (
    <Li>
      <div>
        <div>
          <Language>{name}</Language>
          {state}
        </div>
      </div>
      <div>{button}</div>
    </Li>
  );
};

const Title = styled.div`
  color: #1a1a1a;
  font-size: 20px;
  font-family: SFProDisplay-Semibold;
  font-weight: 600;
  text-align: left;
  line-height: 32px;
  margin: 24px 0 16px 0;
`;

interface Props {
  languageServers: LanguageServer[];
  installLanguageServer: (ls: string) => void;
}

class AdminLanguageSever extends React.PureComponent<Props> {
  public render() {
    const languageServers = this.props.languageServers.map(ls => (
      <LanguageServerLi
        languageServer={ls}
        key={ls.name}
        installLanguageServer={this.props.installLanguageServer}
      />
    ));
    return (
      <Root>
        <Title>{this.props.languageServers.length} Language Server(s)</Title>
        <ul>{languageServers}</ul>
      </Root>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  languageServers: state.languageServer.languageServers,
});

const mapDispatchToProps = {
  installLanguageServer,
};

export const LanguageSeverTab = connect(
  mapStateToProps,
  mapDispatchToProps
)(AdminLanguageSever);
