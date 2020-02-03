/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiTabs,
  EuiTab,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import euiStyled from '../../../../../../legacy/common/eui_styled_components';
import { Section } from '../sections';
import { useLink, useConfig } from '../hooks';
import { EPM_PATH, FLEET_PATH, AGENT_CONFIG_PATH } from '../constants';

interface Props {
  section: Section;
  children?: React.ReactNode;
}

const Nav = euiStyled.nav`
  background: ${props => props.theme.eui.euiColorEmptyShade};
  border-bottom: ${props => props.theme.eui.euiBorderThin};
  padding: ${props =>
    `${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL} ${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL}`};
  .euiTabs {
    padding-left: 3px;
    margin-left: -3px;
  };
`;

export const DefaultLayout: React.FunctionComponent<Props> = ({ section, children }) => {
  const { epm, fleet } = useConfig();
  return (
    <div>
      <Nav>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="savedObjectsApp" size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTabs display="condensed">
              <EuiTab isSelected={!section || section === 'overview'} href={useLink()}>
                <FormattedMessage
                  id="xpack.ingestManager.appNavigation.overviewLinkText"
                  defaultMessage="Overview"
                />
              </EuiTab>
              <EuiTab
                isSelected={section === 'epm'}
                href={useLink(EPM_PATH)}
                disabled={!epm?.enabled}
              >
                <FormattedMessage
                  id="xpack.ingestManager.appNavigation.packagesLinkText"
                  defaultMessage="Packages"
                />
              </EuiTab>
              <EuiTab isSelected={section === 'agent_config'} href={useLink(AGENT_CONFIG_PATH)}>
                <FormattedMessage
                  id="xpack.ingestManager.appNavigation.configurationsLinkText"
                  defaultMessage="Configurations"
                />
              </EuiTab>
              <EuiTab
                isSelected={section === 'fleet'}
                href={useLink(FLEET_PATH)}
                disabled={!fleet?.enabled}
              >
                <FormattedMessage
                  id="xpack.ingestManager.appNavigation.fleetLinkText"
                  defaultMessage="Fleet"
                />
              </EuiTab>
            </EuiTabs>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Nav>
      <EuiPage>
        <EuiPageBody>{children}</EuiPageBody>
      </EuiPage>
    </div>
  );
};
