/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiHeader,
  EuiHeaderLink,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import {
  ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability/locators';
import { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import {
  getDiscoverColumnsFromDisplayOptions,
  LogExplorerControllerContext,
} from '@kbn/log-explorer-plugin/public';
import { LOG_EXPLORER_FEEDBACK_LINK } from '@kbn/observability-shared-plugin/common';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { euiThemeVars } from '@kbn/ui-theme';
import { useActor } from '@xstate/react';
import React, { useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { filter, Observable, take } from 'rxjs';
import {
  betaBadgeDescription,
  betaBadgeTitle,
  discoverLinkTitle,
  feedbackLinkTitle,
  onboardingLinkTitle,
} from '../../common/translations';
import { ObservabilityLogExplorerService } from '../state_machines/observability_log_explorer/src/state_machine';
import { ObservabilityLogExplorerAppMountParameters } from '../types';
import { getRouterLinkProps } from '../utils/get_router_link_props';
import { PluginKibanaContextValue } from '../utils/use_kibana';

interface LogExplorerTopNavMenuProps {
  pageStateService: ObservabilityLogExplorerService;
  services: KibanaReactContextValue<PluginKibanaContextValue>['services'];
  setHeaderActionMenu: ObservabilityLogExplorerAppMountParameters['setHeaderActionMenu'];
  theme$: ObservabilityLogExplorerAppMountParameters['theme$'];
}

export const LogExplorerTopNavMenu = ({
  pageStateService,
  services,
  setHeaderActionMenu,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  const { serverless } = services;

  return Boolean(serverless) ? (
    <ServerlessTopNav services={services} state$={state$} />
  ) : (
    <StatefulTopNav
      services={services}
      setHeaderActionMenu={setHeaderActionMenu}
      state$={state$}
      theme$={theme$}
    />
  );
};

const ServerlessTopNav = ({
  services,
  pageStateService,
}: Pick<LogExplorerTopNavMenuProps, 'services' | 'pageStateService'>) => {
  return (
    <EuiHeader data-test-subj="logExplorerHeaderMenu">
      <EuiHeaderSection>
        <EuiHeaderSectionItem>
          <EuiHeaderLinks gutterSize="xs">
            <DiscoverLink services={services} pageStateService={pageStateService} />
          </EuiHeaderLinks>
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
          <FeedbackLink />
          <VerticalRule />
        </EuiHeaderSectionItem>
        <EuiHeaderSectionItem>
          <OnboardingLink services={services} />
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </EuiHeader>
  );
};

const StatefulTopNav = ({
  setHeaderActionMenu,
  services,
  pageStateService,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  /**
   * Since the breadcrumbsAppendExtension might be set only during a plugin start (e.g. search session)
   * we retrieve the latest valid extension in order to restore it once we unmount the beta badge.
   */
  const [previousAppendExtension$] = useState(() =>
    services.chrome.getBreadcrumbsAppendExtension$().pipe(filter(Boolean), take(1))
  );

  const previousAppendExtension = useObservable(previousAppendExtension$);

  useEffect(() => {
    const { chrome, i18n, theme } = services;

    if (chrome) {
      chrome.setBreadcrumbsAppendExtension({
        content: toMountPoint(
          <EuiHeaderSection
            data-test-subj="logExplorerHeaderMenu"
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
          { theme, i18n }
        ),
      });
    }

    return () => {
      if (chrome) {
        chrome.setBreadcrumbsAppendExtension(previousAppendExtension);
      }
    };
  }, [services, previousAppendExtension]);

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiHeaderSection data-test-subj="logExplorerHeaderMenu">
        <EuiHeaderSectionItem>
          <EuiHeaderLinks gutterSize="xs">
            <DiscoverLink services={services} pageStateService={pageStateService} />
            <OnboardingLink services={services} />
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </HeaderMenuPortal>
  );
};

const ConnectedDiscoverLink = {};

const DiscoverLink = React.memo(
  ({
    services,
    pageStateService,
  }: Pick<LogExplorerTopNavMenuProps, 'services' | 'pageStateService'>) => {
    const [state] = useActor(pageStateService);

    const logExplorerState = useObservable(state$);

    const discoverLinkParams = useMemo(
      () => ({
        columns:
          logExplorerState != null
            ? getDiscoverColumnsFromDisplayOptions(logExplorerState)
            : undefined,
        // filters: appState?.filters,
        // query: appState?.query,
        dataViewSpec: logExplorerState?.datasetSelection?.selection.dataset.toDataviewSpec(),
      }),
      [logExplorerState]
    );

    const discoverUrl = services.discover.locator?.getRedirectUrl(discoverLinkParams);

    const navigateToDiscover = () => {
      services.discover.locator?.navigate(discoverLinkParams);
    };

    const discoverLinkProps = getRouterLinkProps({
      href: discoverUrl,
      onClick: navigateToDiscover,
    });

    return (
      <EuiHeaderLink
        {...discoverLinkProps}
        color="primary"
        iconType="discoverApp"
        data-test-subj="logExplorerDiscoverFallbackLink"
      >
        {discoverLinkTitle}
      </EuiHeaderLink>
    );
  }
);

const OnboardingLink = React.memo(({ services }: Pick<LogExplorerTopNavMenuProps, 'services'>) => {
  const locator = services.share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const onboardingUrl = locator?.useUrl({});

  const navigateToOnboarding = () => {
    locator?.navigate({});
  };

  const onboardingLinkProps = getRouterLinkProps({
    href: onboardingUrl,
    onClick: navigateToOnboarding,
  });

  return (
    <EuiButton
      {...onboardingLinkProps}
      fill
      size="s"
      iconType="indexOpen"
      data-test-subj="logExplorerOnboardingLink"
    >
      {onboardingLinkTitle}
    </EuiButton>
  );
});

const FeedbackLink = React.memo(() => {
  return (
    <EuiHeaderLink
      color="primary"
      href={LOG_EXPLORER_FEEDBACK_LINK}
      iconType="popout"
      iconSide="right"
      iconSize="s"
      target="_blank"
    >
      {feedbackLinkTitle}
    </EuiHeaderLink>
  );
});

const VerticalRule = styled.span`
  width: 1px;
  height: 20px;
  background-color: ${euiThemeVars.euiColorLightShade};
`;
