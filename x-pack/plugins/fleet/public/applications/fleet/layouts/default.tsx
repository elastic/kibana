/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import styled from 'styled-components';
import { EuiTabs, EuiTab, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Section } from '../sections';
import { AlphaMessaging, SettingFlyout } from '../components';
import { useLink, useConfig } from '../hooks';

interface Props {
  showSettings?: boolean;
  section?: Section;
  children?: React.ReactNode;
}

const Container = styled.div`
  min-height: calc(
    100vh - ${(props) => parseFloat(props.theme.eui.euiHeaderHeightCompensation) * 2}px
  );
  background: ${(props) => props.theme.eui.euiColorEmptyShade};
  display: flex;
  flex-direction: column;
`;

const Nav = styled.nav`
  background: ${(props) => props.theme.eui.euiColorEmptyShade};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  padding: ${(props) =>
    `${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL} ${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL}`};
  .euiTabs {
    padding-left: 3px;
    margin-left: -3px;
  }
`;

export const DefaultLayout: React.FunctionComponent<Props> = ({
  showSettings = true,
  section,
  children,
}) => {
  const { getHref } = useLink();
  const { agents } = useConfig();
  const [isSettingsFlyoutOpen, setIsSettingsFlyoutOpen] = React.useState(false);

  return (
    <>
      {isSettingsFlyoutOpen && (
        <SettingFlyout
          onClose={() => {
            setIsSettingsFlyoutOpen(false);
          }}
        />
      )}
      <Container>
        <div>
          <Nav>
            <EuiFlexGroup gutterSize="l" alignItems="center">
              <EuiFlexItem>
                <EuiTabs display="condensed">
                  <EuiTab isSelected={section === 'overview'} href={getHref('overview')}>
                    <FormattedMessage
                      id="xpack.fleet.appNavigation.overviewLinkText"
                      defaultMessage="Overview"
                    />
                  </EuiTab>
                  <EuiTab isSelected={section === 'epm'} href={getHref('integrations_all')}>
                    <FormattedMessage
                      id="xpack.fleet.appNavigation.epmLinkText"
                      defaultMessage="Integrations"
                    />
                  </EuiTab>
                  <EuiTab isSelected={section === 'agent_policy'} href={getHref('policies_list')}>
                    <FormattedMessage
                      id="xpack.fleet.appNavigation.policiesLinkText"
                      defaultMessage="Policies"
                    />
                  </EuiTab>
                  <EuiTab
                    isSelected={section === 'fleet'}
                    href={getHref('fleet')}
                    disabled={!agents?.enabled}
                  >
                    <FormattedMessage
                      id="xpack.fleet.appNavigation.agentsLinkText"
                      defaultMessage="Agents"
                    />
                  </EuiTab>
                  <EuiTab isSelected={section === 'data_stream'} href={getHref('data_streams')}>
                    <FormattedMessage
                      id="xpack.fleet.appNavigation.dataStreamsLinkText"
                      defaultMessage="Data streams"
                    />
                  </EuiTab>
                </EuiTabs>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" direction="row">
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      iconType="popout"
                      href="https://ela.st/ingest-manager-feedback"
                      target="_blank"
                    >
                      <FormattedMessage
                        id="xpack.fleet.appNavigation.sendFeedbackButton"
                        defaultMessage="Send feedback"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  {showSettings ? (
                    <EuiFlexItem>
                      <EuiButtonEmpty iconType="gear" onClick={() => setIsSettingsFlyoutOpen(true)}>
                        <FormattedMessage
                          id="xpack.fleet.appNavigation.settingsButton"
                          defaultMessage="Settings"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Nav>
          {children}
        </div>
        <AlphaMessaging />
      </Container>
    </>
  );
};
