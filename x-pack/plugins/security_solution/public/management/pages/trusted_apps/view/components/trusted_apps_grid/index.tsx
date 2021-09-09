/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

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
import { APP_ID } from '../../../../../../../common/constants';
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

  const handlePaginationChange: PaginatedContentProps<
    TrustedApp,
    ArtifactEntryCardType
  >['onChange'] = useTrustedAppsNavigateCallback(({ pageIndex, pageSize }) => ({
    page_index: pageIndex,
    page_size: pageSize,
  }));

  const handleArtifactCardProps = useMemo(() => {
    // cache card props to avoid re-renders
    const cachedCardProps: Record<string, ArtifactEntryCardProps> = {};

    return (trustedApp: TrustedApp): ArtifactEntryCardProps => {
      if (!cachedCardProps[trustedApp.id]) {
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
                label: i18n.translate(
                  'xpack.securitySolution.trustedapps.grid.policyDetailsLinkBackLabel',
                  { defaultMessage: 'Back to trusted Applications' }
                ),
                navigateTo: [
                  APP_ID,
                  {
                    path: currentPagePath,
                  },
                ],
                href: getAppUrl({ path: currentPagePath }),
              },
            };

            policyToNavOptionsMap[policyId] = {
              navigateAppId: APP_ID,
              navigateOptions: {
                path: policyDetailsPath,
                state: routeState,
              },
              href: getAppUrl({ path: policyDetailsPath }),
              children: policyListById[policyId]?.name ?? policyId,
            };
            return policyToNavOptionsMap;
          }, {});
        }

        cachedCardProps[trustedApp.id] = {
          item: trustedApp,
          policies,
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
              children: i18n.translate('xpack.securitySolution.trustedapps.grid.cardAction.edit', {
                defaultMessage: 'Edit trusted application',
              }),
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
              children: i18n.translate(
                'xpack.securitySolution.trustedapps.grid.cardAction.delete',
                {
                  defaultMessage: 'Delete trusted application',
                }
              ),
            },
          ],
        };
      }

      return cachedCardProps[trustedApp.id];
    };
  }, [dispatch, getAppUrl, history, location, policyListById]);

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
