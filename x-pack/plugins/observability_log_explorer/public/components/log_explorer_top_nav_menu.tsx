/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import deepEqual from 'fast-deep-equal';
import useObservable from 'react-use/lib/useObservable';
import { type BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { AppMountParameters } from '@kbn/core-application-browser';
import {
  EuiBetaBadge,
  EuiButton,
  EuiHeaderLink,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { LogExplorerStateContainer } from '@kbn/log-explorer-plugin/public';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/observability-onboarding-plugin/public';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import {
  betaBadgeDescription,
  betaBadgeTitle,
  discoverLinkTitle,
  onboardingLinkTitle,
} from '../../common/translations';

interface LogExplorerTopNavMenuProps {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  state$: BehaviorSubject<LogExplorerStateContainer>;
  theme$: AppMountParameters['theme$'];
}

export const LogExplorerTopNavMenu = ({
  setHeaderActionMenu,
  state$,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiHeaderSection
        data-test-subj="logExplorerHeaderMenu"
        css={css`
          gap: ${euiTheme.size.m};
        `}
      >
        <EuiHeaderSectionItem>
          <EuiBetaBadge
            label={betaBadgeTitle}
            tooltipContent={betaBadgeDescription}
            alignment="middle"
          />
        </EuiHeaderSectionItem>
        <EuiHeaderLinks gutterSize="xs">
          <DiscoverLink state$={state$} />
          <OnboardingLink />
        </EuiHeaderLinks>
      </EuiHeaderSection>
    </HeaderMenuPortal>
  );
};

const DiscoverLink = React.memo(
  ({ state$ }: { state$: BehaviorSubject<LogExplorerStateContainer> }) => {
    const {
      services: { discover },
    } = useKibanaContextForPlugin();

    const { appState, logExplorerState } = useObservable<LogExplorerStateContainer>(
      state$.pipe(
        distinctUntilChanged<LogExplorerStateContainer>((prev, curr) => {
          if (!prev.appState || !curr.appState) return false;
          return deepEqual(
            [
              prev.appState.columns,
              prev.appState.filters,
              prev.appState.index,
              prev.appState.query,
            ],
            [curr.appState.columns, curr.appState.filters, curr.appState.index, curr.appState.query]
          );
        })
      ),
      { appState: {}, logExplorerState: {} }
    );

    const discoverLinkParams = {
      columns: appState?.columns,
      filters: appState?.filters,
      query: appState?.query,
      dataViewSpec: logExplorerState?.datasetSelection?.selection.dataset.toDataviewSpec(),
    };

    return (
      <EuiHeaderLink
        onClick={() => discover.locator?.navigate(discoverLinkParams)}
        color="primary"
        iconType="discoverApp"
        data-test-subj="logExplorerDiscoverFallbackLink"
      >
        {discoverLinkTitle}
      </EuiHeaderLink>
    );
  }
);

const OnboardingLink = React.memo(() => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const locator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const navigateToOnboarding = () => {
    locator?.navigate({});
  };

  return (
    <EuiButton
      onClick={navigateToOnboarding}
      fill
      size="s"
      iconType="indexOpen"
      data-test-subj="logExplorerOnboardingLink"
    >
      {onboardingLinkTitle}
    </EuiButton>
  );
});
