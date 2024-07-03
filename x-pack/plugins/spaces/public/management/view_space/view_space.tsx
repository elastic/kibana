/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { FC } from 'react';

import type { ApplicationStart, Capabilities, ScopedHistory } from '@kbn/core/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { Role } from '@kbn/security-plugin-types-common';

import { TAB_ID_CONTENT, TAB_ID_FEATURES, TAB_ID_ROLES } from './constants';
import { useTabs } from './hooks/use_tabs';
import { ViewSpaceContextProvider } from './hooks/view_space_context_provider';
import { addSpaceIdToPath, ENTER_SPACE_PATH, type Space } from '../../../common';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { SpaceSolutionBadge } from '../../space_solution_badge';
import type { SpacesManager } from '../../spaces_manager';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

const getSelectedTabId = (selectedTabId?: string) => {
  // Validation of the selectedTabId routing parameter, default to the Content tab
  return selectedTabId && [TAB_ID_FEATURES, TAB_ID_ROLES].includes(selectedTabId)
    ? selectedTabId
    : TAB_ID_CONTENT;
};

interface PageProps {
  capabilities: Capabilities;
  allowFeatureVisibility: boolean; // FIXME: handle this
  solutionNavExperiment?: Promise<boolean>;
  getFeatures: FeaturesPluginStart['getFeatures'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  serverBasePath: string;
  spacesManager: SpacesManager;
  history: ScopedHistory;
  onLoadSpace: (space: Space) => void;
  spaceId?: string;
  selectedTabId?: string;
}

const handleApiError = (error: Error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  throw error;
};

export const ViewSpacePage: FC<PageProps> = (props) => {
  const {
    spaceId,
    getFeatures,
    spacesManager,
    history,
    onLoadSpace,
    solutionNavExperiment,
    selectedTabId: _selectedTabId,
    capabilities,
    getUrlForApp,
    navigateToUrl,
  } = props;

  const selectedTabId = getSelectedTabId(_selectedTabId);
  const [space, setSpace] = useState<Space | null>(null);
  const [userActiveSpace, setUserActiveSpace] = useState<Space | null>(null);
  const [features, setFeatures] = useState<KibanaFeature[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingSpace, setIsLoadingSpace] = useState(true);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [tabs, selectedTabContent] = useTabs(space, features, roles, selectedTabId);
  const [isSolutionNavEnabled, setIsSolutionNavEnabled] = useState(false);

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getSpaceInfo = async () => {
      const [activeSpace, currentSpace] = await Promise.all([
        spacesManager.getActiveSpace(),
        spacesManager.getSpace(spaceId),
      ]);

      setSpace(currentSpace);
      setUserActiveSpace(activeSpace);
      setIsLoadingSpace(false);
    };

    getSpaceInfo().catch(handleApiError);
  }, [spaceId, spacesManager]);

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getRoles = async () => {
      const result = await spacesManager.getRolesForSpace(spaceId);
      setRoles(result);
      setIsLoadingRoles(false);
    };

    getRoles().catch(handleApiError);
  }, [spaceId, spacesManager]);

  useEffect(() => {
    const _getFeatures = async () => {
      const result = await getFeatures();
      setFeatures(result);
      setIsLoadingFeatures(false);
    };
    _getFeatures().catch(handleApiError);
  }, [getFeatures]);

  useEffect(() => {
    if (space) {
      onLoadSpace?.(space);
    }
  }, [onLoadSpace, space]);

  useEffect(() => {
    solutionNavExperiment?.then((isEnabled) => {
      console.log(isEnabled ? 'yeah' : 'nope');
      setIsSolutionNavEnabled(isEnabled);
    });
  }, [solutionNavExperiment]);

  if (!space) {
    return null;
  }

  if (isLoadingSpace || isLoadingFeatures || isLoadingRoles) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const HeaderAvatar = () => {
    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazySpaceAvatar space={space} size="xl" />
      </Suspense>
    );
  };

  const SettingsButton = () => {
    const href = getUrlForApp('management', {
      path: `/kibana/spaces/edit/${space.id}`,
    });

    return capabilities.spaces.manage ? (
      <a
        href={href}
        onClick={(event) => {
          event.preventDefault();
          navigateToUrl(href);
        }}
      >
        <EuiButtonEmpty iconType="gear">
          <FormattedMessage
            id="xpack.spaces.management.viewSpace.spaceSettingsButton.label"
            defaultMessage="Settings"
          />
        </EuiButtonEmpty>
      </a>
    ) : null;
  };

  const SwitchButton = () => {
    if (userActiveSpace?.id === space.id) {
      return null;
    }

    const { serverBasePath } = props;

    // use href to force full page reload (needed in order to change spaces)
    return (
      <EuiButton
        iconType="merge"
        href={addSpaceIdToPath(
          serverBasePath,
          space.id,
          `${ENTER_SPACE_PATH}?next=/app/management/kibana/spaces/view/${space.id}`
        )}
        data-test-subj="spaceSwitcherButton"
      >
        <FormattedMessage
          id="xpack.spaces.management.spaceDetails.space.switchToSpaceButton.label"
          defaultMessage="Switch to this space"
        />
      </EuiButton>
    );
  };

  return (
    <ViewSpaceContextProvider
      spacesManager={spacesManager}
      serverBasePath={props.serverBasePath}
      navigateToUrl={navigateToUrl}
      getUrlForApp={getUrlForApp}
    >
      <EuiText>
        <EuiFlexGroup data-test-subj="spaceDetailsHeader">
          <EuiFlexItem grow={false}>
            <HeaderAvatar />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1 data-test-subj="spaceTitle">
                {space.name}
                {isSolutionNavEnabled ? (
                  <>
                    {' '}
                    <SpaceSolutionBadge
                      solution={space.solution}
                      data-test-subj={`space-solution-badge-${space.solution}`}
                    />
                  </>
                ) : null}
                {userActiveSpace?.id === space.id ? (
                  <>
                    {' '}
                    <EuiBadge color="primary">
                      <FormattedMessage
                        id="xpack.spaces.management.spaceDetails.space.badge.isCurrent"
                        description="Text for a badge shown in the Space details the particular Space is the one currently in the user session."
                        defaultMessage="current"
                      />
                    </EuiBadge>
                  </>
                ) : null}
              </h1>
            </EuiTitle>

            <EuiText size="s">
              <p>
                {space.description ?? (
                  <FormattedMessage
                    id="xpack.spaces.management.spaceDetails.space.description"
                    defaultMessage="Organize your saved objects and show related features for creating new content."
                  />
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <SettingsButton />
              </EuiFlexItem>
              <EuiFlexItem>
                <SwitchButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTabs>
              {tabs.map((tab, index) => (
                <EuiTab
                  key={index}
                  isSelected={tab.id === selectedTabId}
                  append={tab.append}
                  {...reactRouterNavigate(
                    history,
                    `/view/${encodeURIComponent(space.id)}/${tab.id}`
                  )}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
          </EuiFlexItem>
          <EuiFlexItem>{selectedTabContent ?? null}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </ViewSpaceContextProvider>
  );
};
