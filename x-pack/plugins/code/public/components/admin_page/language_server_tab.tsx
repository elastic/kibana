/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
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

const LanguageServerState = styled(EuiTextColor)`
  color: ${props => props.color};
`;

const LanguageServerLi = (props: {
  languageServer: LanguageServer;
  requestInstallLanguageServer: (l: string) => void;
  loading: boolean;
}) => {
  const { status, name } = props.languageServer;

  let languageIcon = () => {
    if (name === 'Typescript') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g fill="none" fill-rule="evenodd">
            <rect width="32" height="32" />
            <path fill="#343741" fill-rule="nonzero" d="M0,0 L26,0 L26,26 L0,26 L0,0 Z M15.47,21.4644444 C16.1922222,22.88 17.6511111,23.9633333 19.9333333,23.9633333 C22.2444444,23.9633333 23.9777778,22.7644444 23.9777778,20.5544444 C23.9777778,18.5177778 22.8077778,17.6077778 20.7277778,16.7122222 L20.1211111,16.4522222 C19.0666667,16.0044444 18.6188889,15.7011111 18.6188889,14.9788889 C18.6188889,14.3866667 19.0666667,13.9244444 19.7888889,13.9244444 C20.4822222,13.9244444 20.9444444,14.2277778 21.3633333,14.9788889 L23.2555556,13.7222222 C22.4611111,12.3355556 21.3344444,11.8011111 19.7888889,11.8011111 C17.6077778,11.8011111 16.2066667,13.1877778 16.2066667,15.0222222 C16.2066667,17.0155556 17.3766667,17.9544444 19.1388889,18.7055556 L19.7455556,18.9655556 C20.8722222,19.4566667 21.5366667,19.76 21.5366667,20.5977778 C21.5366667,21.2911111 20.8866667,21.7966667 19.8755556,21.7966667 C18.6766667,21.7966667 17.9833333,21.1755556 17.4633333,20.3088889 L15.47,21.4644444 Z M14.4444444,11.9166667 L7.22222222,11.9166667 L7.22222222,14.0833333 L9.38888889,14.0833333 L9.38888889,24.5555556 L11.9166667,24.5555556 L11.9166667,14.0833333 L14.4444444,14.0833333 L14.4444444,11.9166667 Z" transform="translate(3 3)"/>
          </g>
        </svg>
      )
    } else if (name === 'Java') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g fill="none" fill-rule="evenodd">
            <rect width="32" height="32" />
            <path fill="#343741" fill-rule="nonzero" d="M6.65133715,21.6542239 C6.65133715,21.6542239 5.58131391,22.276089 7.41206217,22.4873705 C9.63052249,22.7400382 10.7653474,22.7040978 13.2103357,22.2412384 C13.2103357,22.2412384 13.8528947,22.6441999 14.7513857,22.993794 C9.27003527,25.3429432 2.34619439,22.8576593 6.65133715,21.6542239 Z M5.98100805,18.5884578 C5.98100805,18.5884578 4.78083873,19.4771497 6.61376494,19.6666484 C8.98360848,19.9106042 10.8557408,19.9312956 14.0946721,19.3072526 C14.0946721,19.3072526 14.5422842,19.7613986 15.2469215,20.0097103 C8.61985433,21.9471879 1.23805487,20.1621821 5.98100805,18.5884578 Z M11.6279005,13.3886342 C12.9780624,14.9441037 11.272859,16.3427706 11.272859,16.3427706 C11.272859,16.3427706 14.7023792,14.5730104 13.1275651,12.3556391 C11.6562155,10.2885616 10.5290152,9.26155543 16.6355009,5.71986139 C16.6355009,5.71986139 7.04947126,8.1140008 11.6279005,13.3886342 Z M18.8768322,23.9211483 C18.8768322,23.9211483 19.6685944,24.5740554 18.0044758,25.0782993 C14.8406918,26.0366907 4.83638239,26.3263869 2.05704474,25.116416 C1.05835647,24.6818733 2.93157744,24.0785217 3.52077129,23.9521871 C4.1350139,23.8193202 4.48678723,23.8432794 4.48678723,23.8432794 C3.37592402,23.0602291 -2.69462129,25.3799734 1.403595,26.0443144 C12.5797564,27.8565471 21.7759674,25.2291355 18.8768322,23.9211483 Z M7.16538513,15.4132383 C7.16538513,15.4132383 2.07555902,16.6215754 5.36240912,17.0604756 C6.7499004,17.2467081 9.51616908,17.2042339 12.0940268,16.9885964 C14.2003117,16.8110757 16.31531,16.4331632 16.31531,16.4331632 C16.31531,16.4331632 15.572556,16.7511761 15.0356379,17.1181955 C9.86794281,18.4773705 -0.114585395,17.844614 2.75950241,16.454946 C5.19033408,15.2798257 7.16538513,15.4132383 7.16538513,15.4132383 Z M16.2946169,20.515044 C21.5483503,17.7858026 19.1186085,15.1622028 17.4239969,15.5150664 C17.0079677,15.6011047 16.8228233,15.6762517 16.8228233,15.6762517 C16.8228233,15.6762517 16.977473,15.4344754 17.2715251,15.3299236 C20.6248112,14.1504474 23.2048469,18.807363 16.1889787,20.6522667 C16.1889787,20.6522667 16.2706611,20.5792994 16.2946169,20.515044 Z M13.1259313,0 C13.1259313,0 16.0354154,2.9100278 10.3667418,7.38506722 C5.8209126,10.9746821 9.32993567,13.022158 10.3645638,15.3604166 C7.71155918,12.9666144 5.76427996,10.8592405 7.07008922,8.89780294 C8.98796272,6.018269 14.2999635,4.62315446 13.1259313,0 Z M7.68160939,27.9120908 C12.7240596,28.234458 20.466892,27.7334819 20.6498568,25.3473024 C20.6498568,25.3473024 20.2969949,26.2523282 16.4830275,26.9700348 C12.1789745,27.7803104 6.87078643,27.6855619 3.72333956,27.166069 C3.72333914,27.166069 4.36753154,27.6997194 7.68160939,27.9120908 Z" transform="translate(6 2)"/>
          </g>
        </svg>
      )
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
              <EuiFlexItem grow={false}>
                {languageIcon()}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <strong>{name}</strong>
                </EuiText>
                <EuiText size="s">
                  <h6>
                    {state}
                  </h6>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {button}
          </EuiFlexItem>
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

class AdminLanguageSever extends React.PureComponent<Props> {
  public render() {
    const languageServers = this.props.languageServers.map(ls => (
      <LanguageServerLi
        languageServer={ls}
        key={ls.name}
        requestInstallLanguageServer={this.props.requestInstallLanguageServer}
        loading={this.props.installLoading[ls.name]}
      />
    ));
    return (
      <div>
        <EuiSpacer />
        <EuiText>
          <h3>{this.props.languageServers.length} Language Server(s)</h3>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup direction="column" gutterSize="s">
          {languageServers}
        </EuiFlexGroup>
      </div>
    );
  }
}

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
