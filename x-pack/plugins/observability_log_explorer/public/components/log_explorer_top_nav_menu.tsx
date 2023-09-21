/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { AppMountParameters } from '@kbn/core-application-browser';
import {
  EuiBetaBadge,
  EuiButton,
  EuiHeader,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  useEuiTheme,
} from '@elastic/eui';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability/locators';
import { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { css } from '@emotion/react';
import { PluginKibanaContextValue } from '../utils/use_kibana';
import {
  betaBadgeDescription,
  betaBadgeTitle,
  onboardingLinkTitle,
} from '../../common/translations';
import { getRouterLinkProps } from '../utils/get_router_link_props';

interface LogExplorerTopNavMenuProps {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  services: KibanaReactContextValue<PluginKibanaContextValue>['services'];
  theme$: AppMountParameters['theme$'];
}

export const LogExplorerTopNavMenu = ({
  setHeaderActionMenu,
  services,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  const { serverless } = services;

  return Boolean(serverless) ? (
    <ServerlessTopNav services={services} />
  ) : (
    <StatefulTopNav services={services} setHeaderActionMenu={setHeaderActionMenu} theme$={theme$} />
  );
};

const ServerlessTopNav = ({ services }: Pick<LogExplorerTopNavMenuProps, 'services'>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiHeader data-test-subj="logExplorerHeaderMenu">
      <EuiHeaderSection
        side="right"
        css={css`
          gap: ${euiTheme.size.m};
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
          <OnboardingLink services={services} />
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </EuiHeader>
  );
};

const StatefulTopNav = ({ setHeaderActionMenu, services, theme$ }: LogExplorerTopNavMenuProps) => {
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const { chrome, i18n, theme } = services;

    if (chrome) {
      chrome.setBreadcrumbsAppendExtension({
        content: toMountPoint(
          <EuiHeaderSection
            data-test-subj="logExplorerHeaderMenu"
            css={css`
              margin-left: ${euiTheme.size.m};
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
          </EuiHeaderSection>,
          { theme, i18n }
        ),
      });
    }
  }, [euiTheme, services]);

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiHeaderSection data-test-subj="logExplorerHeaderMenu">
        <EuiHeaderSectionItem>
          <EuiHeaderLinks gutterSize="xs">
            <OnboardingLink services={services} />
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </HeaderMenuPortal>
  );
};

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
