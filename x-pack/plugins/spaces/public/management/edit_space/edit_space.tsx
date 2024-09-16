/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
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

import type { ScopedHistory } from '@kbn/core/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { Role } from '@kbn/security-plugin-types-common';

import { TAB_ID_CONTENT, TAB_ID_GENERAL, TAB_ID_ROLES } from './constants';
import { handleApiError } from './handle_api_error';
import { useTabs } from './hooks/use_tabs';
import { useEditSpaceServices, useEditSpaceStore } from './provider';
import { addSpaceIdToPath, ENTER_SPACE_PATH, type Space } from '../../../common';
import { SOLUTION_VIEW_CLASSIC } from '../../../common/constants';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { SpaceSolutionBadge } from '../../space_solution_badge';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

const getSelectedTabId = (canUserViewRoles: boolean, selectedTabId?: string) => {
  // Validation of the selectedTabId routing parameter, default to the Content tab
  return selectedTabId &&
    [TAB_ID_CONTENT, canUserViewRoles ? TAB_ID_ROLES : null].filter(Boolean).includes(selectedTabId)
    ? selectedTabId
    : TAB_ID_GENERAL;
};

interface PageProps {
  spaceId?: string;
  history: ScopedHistory;
  selectedTabId?: string;
  getFeatures: FeaturesPluginStart['getFeatures'];
  onLoadSpace: (space: Space) => void;
  allowFeatureVisibility: boolean;
  allowSolutionVisibility: boolean;
}

export const EditSpace: FC<PageProps> = ({
  spaceId,
  getFeatures,
  history,
  onLoadSpace,
  selectedTabId: _selectedTabId,
  ...props
}) => {
  const { state, dispatch } = useEditSpaceStore();
  const { invokeClient } = useEditSpaceServices();
  const { spacesManager, capabilities, serverBasePath, logger, notifications } =
    useEditSpaceServices();
  const [space, setSpace] = useState<Space | null>(null);
  const [userActiveSpace, setUserActiveSpace] = useState<Space | null>(null);
  const [features, setFeatures] = useState<KibanaFeature[] | null>(null);
  const [isLoadingSpace, setIsLoadingSpace] = useState(true);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const selectedTabId = getSelectedTabId(Boolean(capabilities?.roles?.view), _selectedTabId);
  const [tabs, selectedTabContent] = useTabs({
    space,
    features,
    rolesCount: state.roles.size,
    capabilities,
    history,
    currentSelectedTabId: selectedTabId,
    ...props,
  });

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getSpaceInfo = async () => {
      // active space: the space that is active in the user's session
      // current space: the space being edited by the user
      const [activeSpace, currentSpace] = await Promise.all([
        spacesManager.getActiveSpace(),
        spacesManager.getSpace(spaceId),
      ]);

      setSpace(currentSpace);
      setUserActiveSpace(activeSpace);
      setIsLoadingSpace(false);
    };

    getSpaceInfo().catch((error) =>
      handleApiError(error, { logger, toasts: notifications.toasts })
    );
  }, [spaceId, spacesManager, logger, notifications.toasts]);

  // Load roles to show the count of assigned roles as a badge in the "Assigned roles" tab title
  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const getRoles = async () => {
      await invokeClient(async (clients) => {
        let result: Role[] = [];
        try {
          result = await clients.spacesManager.getRolesForSpace(spaceId);
        } catch (error) {
          const message = error?.body?.message ?? error.toString();
          const statusCode = error?.body?.statusCode ?? null;
          if (statusCode === 403) {
            logger.error('Insufficient permissions to get list of roles for the space');
            logger.error(message);
          } else {
            logger.error('Encountered error while getting list of roles for space!');
            logger.error(error);
          }
          handleApiError(error, { logger, toasts: notifications.toasts });
        }
        dispatch({ type: 'update_roles', payload: result });
      });

      setIsLoadingRoles(false);
    };

    if (!state.roles.size) {
      // maybe we do not make this call if user can't view roles? 🤔
      getRoles().catch((error) => handleApiError(error, { logger, toasts: notifications.toasts }));
    }
  }, [dispatch, invokeClient, spaceId, state.roles, logger, notifications.toasts]);

  useEffect(() => {
    const _getFeatures = async () => {
      const result = await getFeatures();
      setFeatures(result);
      setIsLoadingFeatures(false);
    };
    _getFeatures().catch((error) =>
      handleApiError(error, { logger, toasts: notifications.toasts })
    );
  }, [getFeatures, logger, notifications.toasts]);

  useEffect(() => {
    if (space) {
      onLoadSpace?.(space);
    }
  }, [onLoadSpace, space]);

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

  const { id, solution: spaceSolution } = space;
  const solution = spaceSolution ?? SOLUTION_VIEW_CLASSIC;
  const shouldShowSolutionBadge =
    props.allowSolutionVisibility || solution !== SOLUTION_VIEW_CLASSIC;

  return (
    <div data-test-subj="spaces-view-page">
      <EuiFlexGroup
        data-test-subj="space-view-page-details-header"
        alignItems="flexStart"
        direction="column"
      >
        <EuiFlexItem grow={true} css={{ flexBasis: '100%', width: '100%' }}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <HeaderAvatar />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiFlexGroup direction="column">
                <EuiFlexItem grow={true} al>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={true}>
                      <EuiTitle size="l">
                        <h1 data-test-subj="spaces-view-page-title">{space.name}</h1>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <React.Fragment>
                        {userActiveSpace?.id !== id ? (
                          <EuiButton
                            iconType="push"
                            href={addSpaceIdToPath(
                              serverBasePath,
                              id,
                              `${ENTER_SPACE_PATH}?next=/app/management/kibana/spaces/edit/${id}`
                            )}
                            data-test-subj="spaces-view-page-switcher-button"
                          >
                            <FormattedMessage
                              id="xpack.spaces.management.spaceDetails.space.switchToSpaceButton.label"
                              defaultMessage="Switch to this space"
                            />
                          </EuiButton>
                        ) : null}
                      </React.Fragment>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div>
                    {shouldShowSolutionBadge ? (
                      <SpaceSolutionBadge
                        solution={solution}
                        data-test-subj={`space-solution-badge-${solution}`}
                      />
                    ) : null}
                    {userActiveSpace?.id === id ? (
                      <EuiBadge color="primary">
                        <FormattedMessage
                          id="xpack.spaces.management.spaceDetails.space.badge.isCurrent"
                          description="Text for a badge shown in the Space details page when the particular Space currently active."
                          defaultMessage="Current"
                        />
                      </EuiBadge>
                    ) : null}
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <p>{space.description}</p>
          </EuiText>
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
                {...reactRouterNavigate(history, `/edit/${encodeURIComponent(id)}/${tab.id}`)}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem>{selectedTabContent ?? null}</EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
