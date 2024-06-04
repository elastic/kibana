/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { FC } from 'react';

import type { ApplicationStart, Capabilities, ScopedHistory } from '@kbn/core/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { Role } from '@kbn/security-plugin-types-common';

import { TAB_ID_CONTENT, TAB_ID_FEATURES, TAB_ID_ROLES } from './constants';
import { useTabs } from './hooks/use_tabs';
import { ViewSpaceContextProvider } from './hooks/view_space_context_provider';
import { addSpaceIdToPath, ENTER_SPACE_PATH, type Space } from '../../../common';
import { getSpaceAvatarComponent } from '../../space_avatar';
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
    selectedTabId: _selectedTabId,
  } = props;

  const selectedTabId = getSelectedTabId(_selectedTabId);
  const [space, setSpace] = useState<Space | null>(null);
  const [features, setFeatures] = useState<KibanaFeature[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tabs, selectedTabContent] = useTabs(space, features, roles, selectedTabId);
  const { capabilities, getUrlForApp, navigateToUrl } = props;

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getSpace = async () => {
      const result = await spacesManager.getSpace(spaceId);
      if (!result) {
        throw new Error(`Could not get resulting space by id ${spaceId}`);
      }
      setSpace(result);
    };

    getSpace().catch(handleApiError);
  }, [spaceId, spacesManager]);

  useEffect(() => {
    const _getFeatures = async () => {
      const result = await getFeatures();
      setFeatures(result);
    };
    _getFeatures().catch(handleApiError);
  }, [getFeatures]);

  useEffect(() => {
    if (spaceId) {
      const getRoles = async () => {
        const result = await spacesManager.getRolesForSpace(spaceId);
        setRoles(result);
      };

      getRoles().catch(handleApiError);
    }
  }, [spaceId, spacesManager]);

  if (!space) {
    return null;
  }

  if (onLoadSpace) {
    onLoadSpace(space);
  }

  const HeaderAvatar = () => {
    return space.imageUrl != null ? (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazySpaceAvatar
          space={{
            ...space,
            initials: space.initials ?? 'X',
            name: undefined,
          }}
          size="xl"
        />
      </Suspense>
    ) : (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazySpaceAvatar
          space={{
            ...space,
            name: space.name ?? 'Y',
            imageUrl: undefined,
          }}
          size="xl"
        />
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
        <EuiButtonEmpty iconType="gear">Settings</EuiButtonEmpty>
      </a>
    ) : null;
  };

  const SwitchButton = () => {
    const { serverBasePath } = props;
    const urlToSelectedSpace = addSpaceIdToPath(
      serverBasePath,
      space.id,
      `${ENTER_SPACE_PATH}?next=/app/management/kibana/spaces/view/${space.id}`
    );

    // use href to force full page reload (needed in order to change spaces)
    return (
      <EuiButton iconType="merge" href={urlToSelectedSpace}>
        Switch to this space
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
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <HeaderAvatar />
          </EuiFlexItem>
          <EuiFlexItem>
            <h1>{space.name}</h1>
            <p>
              <small>
                {space.description ??
                  'Organize your saved objects and show related features for creating new content.'}
              </small>
            </p>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SettingsButton />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SwitchButton />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              isSelected={tab.id === selectedTabId}
              append={tab.append}
              {...reactRouterNavigate(history, `/view/${encodeURIComponent(space.id)}/${tab.id}`)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer />

        {selectedTabContent ?? null}
      </EuiText>
    </ViewSpaceContextProvider>
  );
};
