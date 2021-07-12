/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { HeaderSection } from '../../../common/components/header_section';
import { ID as CTIEventCountQueryId } from '../../containers/overview_cti_links/use_cti_event_counts';
import { CtiListItem } from '../../containers/overview_cti_links/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { CtiInnerPanel } from './cti_inner_panel';
import * as i18n from './translations';
import { shortenCountIntoString } from '../../../common/utils/shorten_count_into_string';

const DashboardLink = styled.li`
  margin: 0 ${({ theme }) => theme.eui.paddingSizes.s} 0 ${({ theme }) => theme.eui.paddingSizes.m};
`;

const DashboardLinkItems = styled(EuiFlexGroup)`
  width: 100%;
`;

const Title = styled(EuiFlexItem)`
  min-width: 110px;
`;

const List = styled.ul`
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const DashboardRightSideElement = styled(EuiFlexItem)`
  align-items: flex-end;
`;

const RightSideLink = styled(EuiLink)`
  text-align: right;
  min-width: 180px;
`;

interface ThreatIntelPanelViewProps {
  buttonHref?: string;
  isDashboardPluginDisabled?: boolean;
  listItems: CtiListItem[];
  splitPanel?: JSX.Element;
  totalEventCount: number;
}

const linkCopy = (
  <FormattedMessage
    id="xpack.securitySolution.overview.ctiViewSourceDasboard"
    defaultMessage="View source dashboard"
  />
);

const panelTitle = (
  <FormattedMessage
    id="xpack.securitySolution.overview.ctiDashboardTitle"
    defaultMessage="Threat Intelligence"
  />
);

export const ThreatIntelPanelView: React.FC<ThreatIntelPanelViewProps> = ({
  buttonHref = '',
  isDashboardPluginDisabled,
  listItems,
  splitPanel,
  totalEventCount,
}) => {
  const subtitle = useMemo(
    () => (
      <FormattedMessage
        data-test-subj="cti-total-event-count"
        defaultMessage="Showing: {totalEventCount} {totalEventCount, plural, one {indicator} other {indicators}}"
        id="xpack.securitySolution.overview.ctiDashboardSubtitle"
        values={{ totalEventCount }}
      />
    ),
    [totalEventCount]
  );

  const button = useMemo(
    () => (
      <EuiButton href={buttonHref} isDisabled={!buttonHref} target="_blank">
        <FormattedMessage
          id="xpack.securitySolution.overview.ctiViewDasboard"
          defaultMessage="View dashboard"
        />
      </EuiButton>
    ),
    [buttonHref]
  );

  const threatIntelDashboardDocLink = `${
    useKibana().services.docLinks.links.filebeat.base
  }/load-kibana-dashboards.html`;
  const infoPanel = useMemo(
    () =>
      isDashboardPluginDisabled ? (
        <CtiInnerPanel
          data-test-subj="cti-inner-panel-info"
          color={'primary'}
          title={i18n.INFO_TITLE}
          body={i18n.INFO_BODY}
          button={
            <EuiButton href={threatIntelDashboardDocLink} target="_blank">
              {i18n.INFO_BUTTON}
            </EuiButton>
          }
        />
      ) : null,
    [isDashboardPluginDisabled, threatIntelDashboardDocLink]
  );

  return (
    <>
      <EuiSpacer data-test-subj="spacer" size="l" />
      <EuiFlexGroup
        gutterSize="l"
        justifyContent="spaceBetween"
        data-test-subj="cti-dashboard-links"
      >
        <EuiFlexItem grow={1}>
          <InspectButtonContainer>
            <EuiPanel hasBorder>
              <HeaderSection id={CTIEventCountQueryId} subtitle={subtitle} title={panelTitle}>
                <>{button}</>
              </HeaderSection>
              {splitPanel}
              {infoPanel}
              <List>
                <EuiFlexGroup direction={'column'}>
                  {listItems.map(({ title, path, count }) => (
                    <DashboardLink key={`${title}-list-item`}>
                      <EuiHorizontalRule margin="s" />
                      <DashboardLinkItems
                        direction="row"
                        gutterSize="l"
                        justifyContent="spaceBetween"
                      >
                        <Title key={`${title}-link`}>{title}</Title>
                        <EuiFlexGroup
                          gutterSize="s"
                          key={`${title}-divider`}
                          direction="row"
                          alignItems="center"
                          justifyContent="flexEnd"
                        >
                          <DashboardRightSideElement key={`${title}-count`} grow={false}>
                            {shortenCountIntoString(count)}
                          </DashboardRightSideElement>
                          <DashboardRightSideElement key={`${title}-source`} grow={false}>
                            {path ? (
                              <RightSideLink href={path} target="_blank">
                                {linkCopy}
                              </RightSideLink>
                            ) : (
                              <EuiText color={'subdued'} size={'s'}>
                                {linkCopy}
                              </EuiText>
                            )}
                          </DashboardRightSideElement>
                        </EuiFlexGroup>
                      </DashboardLinkItems>
                    </DashboardLink>
                  ))}
                </EuiFlexGroup>
              </List>
            </EuiPanel>
          </InspectButtonContainer>
        </EuiFlexItem>
        <EuiFlexItem grow={1} />
      </EuiFlexGroup>
    </>
  );
};
