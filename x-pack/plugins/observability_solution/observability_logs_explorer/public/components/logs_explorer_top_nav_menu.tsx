/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiHeader,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { euiThemeVars } from '@kbn/ui-theme';
import { LogsExplorerTabs } from '@kbn/discover-plugin/public';
import React, { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { filter, take } from 'rxjs';
import { betaBadgeDescription, betaBadgeTitle } from '../../common/translations';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { ConnectedDiscoverLink } from './discover_link';
import { FeedbackLink } from './feedback_link';
import { ConnectedOnboardingLink } from './onboarding_link';
import { AlertsPopover } from './alerts_popover';

export const LogsExplorerTopNavMenu = () => {
  const {
    services: { serverless },
  } = useKibanaContextForPlugin();

  return Boolean(serverless) ? <ServerlessTopNav /> : <StatefulTopNav />;
};

const ServerlessTopNav = () => {
  const { services } = useKibanaContextForPlugin();

  return (
    <EuiHeader data-test-subj="logsExplorerHeaderMenu" css={{ boxShadow: 'none' }}>
      <EuiHeaderSection>
        <EuiHeaderSectionItem>
          <LogsExplorerTabs services={services} selectedTab="logs-explorer" />
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
      <EuiHeaderSection
        side="right"
        css={css`
          gap: ${euiThemeVars.euiSizeM};
        `}
      >
        <EuiHeaderSectionItem>
          <EuiBetaBadge
            size="s"
            iconType="beta"
            label={betaBadgeTitle}
            tooltipContent={betaBadgeDescription}
            alignment="middle"
          />
        </EuiHeaderSectionItem>
        <EuiHeaderSectionItem>
          <EuiHeaderLinks gutterSize="xs">
            <ConnectedDiscoverLink />
            <VerticalRule />
            <FeedbackLink />
            <VerticalRule />
            <AlertsPopover />
            <VerticalRule />
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
        <EuiHeaderSectionItem>
          <ConnectedOnboardingLink />
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </EuiHeader>
  );
};

const StatefulTopNav = () => {
  const {
    services: {
      appParams: { setHeaderActionMenu },
      chrome,
      i18n: i18nStart,
      theme,
    },
  } = useKibanaContextForPlugin();
  /**
   * Since the breadcrumbsAppendExtension might be set only during a plugin start (e.g. search session)
   * we retrieve the latest valid extension in order to restore it once we unmount the beta badge.
   */
  const [previousAppendExtension$] = useState(() =>
    chrome.getBreadcrumbsAppendExtension$().pipe(filter(Boolean), take(1))
  );

  const previousAppendExtension = useObservable(previousAppendExtension$);

  useEffect(() => {
    if (chrome) {
      chrome.setBreadcrumbsAppendExtension({
        content: toMountPoint(
          <EuiHeaderSection
            data-test-subj="logsExplorerHeaderMenu"
            css={css`
              margin-left: ${euiThemeVars.euiSizeM};
            `}
          >
            <EuiHeaderSectionItem>
              <EuiBetaBadge
                size="s"
                iconType="beta"
                label={betaBadgeTitle}
                tooltipContent={betaBadgeDescription}
                alignment="middle"
              />
            </EuiHeaderSectionItem>
            <EuiHeaderSectionItem>
              <FeedbackLink />
            </EuiHeaderSectionItem>
          </EuiHeaderSection>,
          { theme, i18n: i18nStart }
        ),
      });
    }

    return () => {
      if (chrome) {
        chrome.setBreadcrumbsAppendExtension(previousAppendExtension);
      }
    };
  }, [chrome, i18nStart, previousAppendExtension, theme]);

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme.theme$}>
      <EuiHeaderSection data-test-subj="logsExplorerHeaderMenu">
        <EuiHeaderSectionItem>
          <EuiHeaderLinks gutterSize="xs">
            <ConnectedDiscoverLink />
            <VerticalRule />
            <AlertsPopover />
            <VerticalRule />
            <ConnectedOnboardingLink />
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </HeaderMenuPortal>
  );
};

const VerticalRule = styled.span`
  width: 1px;
  height: 20px;
  background-color: ${euiThemeVars.euiColorLightShade};
`;
