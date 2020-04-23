/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import styled from 'styled-components';
import { EuiTabs, EuiTab, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Section } from '../sections';
import { AlphaMessaging } from '../components';
import { useLink, useConfig } from '../hooks';
import { EPM_PATH, FLEET_PATH, AGENT_CONFIG_PATH } from '../constants';

interface Props {
  section?: Section;
  children?: React.ReactNode;
}

const Container = styled.div`
  min-height: calc(100vh - ${props => props.theme.eui.euiHeaderChildSize});
  background: ${props => props.theme.eui.euiColorEmptyShade};
`;

const Nav = styled.nav`
  background: ${props => props.theme.eui.euiColorEmptyShade};
  border-bottom: ${props => props.theme.eui.euiBorderThin};
  padding: ${props =>
    `${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL} ${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL}`};
  .euiTabs {
    padding-left: 3px;
    margin-left: -3px;
  }
`;

export const DefaultLayout: React.FunctionComponent<Props> = ({ section, children }) => {
  const { epm, fleet } = useConfig();
  return (
    <Container>
      <Nav>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="savedObjectsApp" size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTabs display="condensed">
              <EuiTab isSelected={section === 'overview'} href={useLink()}>
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
                  id="xpack.ingestManager.appNavigation.epmLinkText"
                  defaultMessage="Integrations"
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
      {children}
      <AlphaMessaging />
    </Container>
  );
};
