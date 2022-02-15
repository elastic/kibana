/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';

import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { Pagination } from '../../../state';

import {
  getCurrentLocation,
  getListErrorMessage,
  getListItems,
  getListPagination,
  isListLoading,
  getMapOfPoliciesById,
  isLoadingListOfPolicies,
} from '../../../store/selectors';

import { useTrustedAppsNavigateCallback, useTrustedAppsSelector } from '../../hooks';

import { getPolicyDetailPath, getTrustedAppsListPath } from '../../../../../common/routing';
import {
  PaginatedContent,
  PaginatedContentProps,
} from '../../../../../components/paginated_content';
import { PolicyDetailsRouteState, TrustedApp } from '../../../../../../../common/endpoint/types';
import {
  ArtifactEntryCard,
  ArtifactEntryCardProps,
} from '../../../../../components/artifact_entry_card';
import { AppAction } from '../../../../../../common/store/actions';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { useAppUrl } from '../../../../../../common/lib/kibana';

export interface PaginationBarProps {
  pagination: Pagination;
  onChange: (pagination: { size: number; index: number }) => void;
}

type ArtifactEntryCardType = typeof ArtifactEntryCard;

const RootWrapper = styled.div`
  .trusted-app + .trusted-app {
    margin-top: ${({ theme }) => theme.eui.spacerSizes.l};
  }
`;

const BACK_TO_TRUSTED_APPS_LABEL = i18n.translate(
  'xpack.securitySolution.trustedapps.grid.policyDetailsLinkBackLabel',
  { defaultMessage: 'Back to trusted applications' }
);

const EDIT_TRUSTED_APP_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.trustedapps.grid.cardAction.edit',
  {
    defaultMessage: 'Edit trusted application',
  }
);

const DELETE_TRUSTED_APP_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.trustedapps.grid.cardAction.delete',
  {
    defaultMessage: 'Delete trusted application',
  }
);

export const TrustedAppsGrid = memo(() => {
  const history = useHistory();
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const { getAppUrl } = useAppUrl();

  const pagination = useTrustedAppsSelector(getListPagination);
  const listItems = useTrustedAppsSelector(getListItems);
  const isLoading = useTrustedAppsSelector(isListLoading);
  const error = useTrustedAppsSelector(getListErrorMessage);
  const location = useTrustedAppsSelector(getCurrentLocation);
  const policyListById = useTrustedAppsSelector(getMapOfPoliciesById);
  const loadingPoliciesList = useTrustedAppsSelector(isLoadingListOfPolicies);

  const handlePaginationChange: PaginatedContentProps<
    TrustedApp,
    ArtifactEntryCardType
  >['onChange'] = useTrustedAppsNavigateCallback(({ pageIndex, pageSize }) => ({
    page_index: pageIndex,
    page_size: pageSize,
  }));

  const artifactCardPropsPerItem = useMemo(() => {
    const cachedCardProps: Record<string, ArtifactEntryCardProps> = {};

    // Casting `listItems` below to remove the `Immutable<>` from it in order to prevent errors
    // with common component's props
    for (const trustedApp of listItems as TrustedApp[]) {
      let policies: ArtifactEntryCardProps['policies'];

      if (trustedApp.effectScope.type === 'policy' && trustedApp.effectScope.policies.length) {
        policies = trustedApp.effectScope.policies.reduce<
          Required<ArtifactEntryCardProps>['policies']
        >((policyToNavOptionsMap, policyId) => {
          const currentPagePath = getTrustedAppsListPath({
            ...location,
          });

          const policyDetailsPath = getPolicyDetailPath(policyId);

          const routeState: PolicyDetailsRouteState = {
            backLink: {
              label: BACK_TO_TRUSTED_APPS_LABEL,
              navigateTo: [
                APP_UI_ID,
                {
                  path: currentPagePath,
                },
              ],
              href: getAppUrl({ path: currentPagePath }),
            },
            onCancelNavigateTo: [
              APP_UI_ID,
              {
                path: currentPagePath,
              },
            ],
          };

          policyToNavOptionsMap[policyId] = {
            navigateAppId: APP_UI_ID,
            navigateOptions: {
              path: policyDetailsPath,
              state: routeState,
            },
            href: getAppUrl({ path: policyDetailsPath }),
            children: policyListById[policyId]?.name ?? policyId,
            target: '_blank',
          };
          return policyToNavOptionsMap;
        }, {});
      }

      cachedCardProps[trustedApp.id] = {
        item: trustedApp,
        policies,
        loadingPoliciesList,
        hideComments: true,
        'data-test-subj': 'trustedAppCard',
        actions: [
          {
            icon: 'controlsHorizontal',
            onClick: () => {
              history.push(
                getTrustedAppsListPath({
                  ...location,
                  show: 'edit',
                  id: trustedApp.id,
                })
              );
            },
            'data-test-subj': 'editTrustedAppAction',
            children: EDIT_TRUSTED_APP_ACTION_LABEL,
          },
          {
            icon: 'trash',
            onClick: () => {
              dispatch({
                type: 'trustedAppDeletionDialogStarted',
                payload: { entry: trustedApp },
              });
            },
            'data-test-subj': 'deleteTrustedAppAction',
            children: DELETE_TRUSTED_APP_ACTION_LABEL,
          },
        ],
        hideDescription: !trustedApp.description,
      };
    }

    return cachedCardProps;
  }, [dispatch, getAppUrl, history, listItems, location, policyListById, loadingPoliciesList]);

  const handleArtifactCardProps = useCallback(
    (trustedApp: TrustedApp) => {
      return artifactCardPropsPerItem[trustedApp.id];
    },
    [artifactCardPropsPerItem]
  );

  return (
    <RootWrapper>
      <PaginatedContent<TrustedApp, ArtifactEntryCardType>
        items={listItems as TrustedApp[]}
        onChange={handlePaginationChange}
        ItemComponent={ArtifactEntryCard}
        itemComponentProps={handleArtifactCardProps}
        loading={isLoading}
        itemId="id"
        error={error}
        pagination={pagination}
      />
    </RootWrapper>
  );
});

TrustedAppsGrid.displayName = 'TrustedAppsGrid';
