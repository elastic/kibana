/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import {
  EuiFlexItem,
  EuiPanel,
  EuiFlexGroup,
  EuiSpacer,
  EuiHorizontalRule,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { LinkButton } from '../../../common/components/links';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { HeaderSection } from '../../../common/components/header_section';

import { ID as CTIEventCountQueryId } from '../../containers/overview_cti_links/use_cti_event_counts';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { Filter, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { useThreatIntelDashboardLinks } from '../../containers/overview_cti_links';

export interface ThreatIntelLinkPanelProps
  extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'> {
  filters: Filter[];
  hideHeaderChildren?: boolean;
  indexPattern: IIndexPattern;
  indexNames: string[];
}

const DashboardLink = styled.li`
  margin: 0 ${({ theme }) => theme.eui.paddingSizes.s} 0 ${({ theme }) => theme.eui.paddingSizes.m};
`;

const DashboardLinkItems = styled(EuiFlexGroup)`
  width: 100%;
`;

const Title = styled(EuiFlexItem)`
  min-width: 140px;
`;

const List = styled.ul`
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const DashboardRightSideElement = styled(EuiFlexItem)`
  align-items: flex-end;
  max-width: 160px;
`;

const RightSideLink = styled(EuiLink)`
  text-align: right;
  min-width: 140px;
`;

const ThreatIntelLinkPanelComponent: React.FC<ThreatIntelLinkPanelProps> = (props) => {
  const { buttonLink, dashboardLinks, totalEventCount } = useThreatIntelDashboardLinks(props);

  const panelTitle = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.overview.ctiDashboardTitle"
        defaultMessage="Threat Intelligence"
      />
    ),
    []
  );

  const subtitle = useMemo(() => {
    return totalEventCount ? (
      <FormattedMessage
        defaultMessage="Showing: {totalEventCount} {totalEventCount, plural, one {event} other {events}}"
        id="xpack.securitySolution.overview.ctiDashboardSubtitle"
        values={{ totalEventCount }}
      />
    ) : null;
  }, [totalEventCount]);

  const button = useMemo(() => {
    return buttonLink ? (
      <LinkButton href={buttonLink.path}>
        <FormattedMessage
          id="xpack.securitySolution.overview.ctiViewDasboard"
          defaultMessage="View dashboard"
        />
      </LinkButton>
    ) : null;
  }, [buttonLink]);

  return dashboardLinks?.length ? (
    <>
      <EuiSpacer data-test-subj="spacer" size="l" />
      <EuiFlexGroup
        gutterSize="l"
        justifyContent="spaceBetween"
        data-test-subj="cti-dashboard-links"
      >
        <EuiFlexItem grow={1}>
          <InspectButtonContainer>
            <EuiPanel>
              <HeaderSection id={CTIEventCountQueryId} subtitle={subtitle} title={panelTitle}>
                <>{button}</>
              </HeaderSection>
              <List>
                <EuiFlexGroup direction={'column'}>
                  {dashboardLinks.map(({ title, path, count }) => (
                    <DashboardLink key={`${title}-list-item`}>
                      <EuiHorizontalRule margin="s" />
                      <DashboardLinkItems
                        direction="row"
                        gutterSize="l"
                        justifyContent="spaceBetween"
                      >
                        <Title key={`${title}-link`} grow={3}>
                          {title}
                        </Title>
                        <EuiFlexGroup
                          gutterSize="s"
                          key={`${title}-divider`}
                          direction="row"
                          alignItems="center"
                        >
                          <DashboardRightSideElement key={`${title}-count`} grow={1}>
                            {count}
                          </DashboardRightSideElement>
                          <DashboardRightSideElement key={`${title}-source`} grow={3}>
                            <RightSideLink href={path} data-test-subj="cti-dashboard-link">
                              <FormattedMessage
                                id="xpack.securitySolution.overview.ctiViewSourceDasboard"
                                defaultMessage="View source dashboard"
                              />
                            </RightSideLink>
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
  ) : null;
};

ThreatIntelLinkPanelComponent.displayName = 'ThreatIntelDashboardLinksComponent';

export const ThreatIntelLinkPanel = React.memo(ThreatIntelLinkPanelComponent);
