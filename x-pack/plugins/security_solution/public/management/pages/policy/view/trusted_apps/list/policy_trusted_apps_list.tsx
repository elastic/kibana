/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiLoadingSpinner, Pagination } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  doesPolicyHaveTrustedApps,
  getCurrentArtifactsLocation,
  getPolicyTrustedAppList,
  getPolicyTrustedAppsListPagination,
  isPolicyTrustedAppListLoading,
  policyIdFromParams,
} from '../../../store/policy_details/selectors';
import {
  getPolicyDetailsArtifactsListPath,
  getTrustedAppsListPath,
} from '../../../../../common/routing';
import { Immutable, TrustedApp } from '../../../../../../../common/endpoint/types';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_ID } from '../../../../../../../common/constants';

export const PolicyTrustedAppsList = memo(() => {
  const history = useHistory();
  const { getAppUrl } = useAppUrl();
  const policyId = usePolicyDetailsSelector(policyIdFromParams);
  const hasTrustedApps = usePolicyDetailsSelector(doesPolicyHaveTrustedApps);
  const isLoading = usePolicyDetailsSelector(isPolicyTrustedAppListLoading);
  const trustedAppItems = usePolicyDetailsSelector(getPolicyTrustedAppList);
  const pagination = usePolicyDetailsSelector(getPolicyTrustedAppsListPagination);
  const urlParams = usePolicyDetailsSelector(getCurrentArtifactsLocation);

  const [isCardExpanded, setCardExpanded] = useState<Record<string, boolean>>({});

  // TODO:PT show load errors if any

  const handlePageChange = useCallback<ArtifactCardGridProps['onPageChange']>(
    ({ pageIndex, pageSize }) => {
      history.push(
        getPolicyDetailsArtifactsListPath(policyId, {
          ...urlParams,
          // If user changed page size, then reset page index back to the first page
          page_index: pageSize !== pagination.pageSize ? 0 : pageIndex,
          page_size: pageSize,
        })
      );
    },
    [history, pagination.pageSize, policyId, urlParams]
  );

  const handleExpandCollapse = useCallback<ArtifactCardGridProps['onExpandCollapse']>(
    ({ expanded, collapsed }) => {
      const newCardExpandedSettings: Record<string, boolean> = {};

      for (const trustedApp of expanded) {
        newCardExpandedSettings[trustedApp.id] = true;
      }

      for (const trustedApp of collapsed) {
        newCardExpandedSettings[trustedApp.id] = false;
      }

      setCardExpanded(newCardExpandedSettings);
    },
    []
  );

  const cardProps = useMemo<
    Map<Immutable<TrustedApp>, ReturnType<Required<ArtifactCardGridProps>['cardComponentProps']>>
  >(() => {
    const newCardProps = new Map();

    for (const trustedApp of trustedAppItems) {
      const viewUrlPath = getTrustedAppsListPath({ id: trustedApp.id, show: 'edit' });

      newCardProps.set(trustedApp, {
        expanded: Boolean(isCardExpanded[trustedApp.id]),
        actions: [
          {
            icon: 'controlsHorizontal',
            children: i18n.translate(
              'xpack.securitySolution.endpoint.policy.trustedApps.list.viewAction',
              { defaultMessage: 'View full details' }
            ),
            href: getAppUrl({ appId: APP_ID, path: viewUrlPath }),
            navigateAppId: APP_ID,
            navigateOptions: { path: viewUrlPath },
          },
        ],
      });
    }

    return newCardProps;
  }, [getAppUrl, isCardExpanded, trustedAppItems]);

  const provideCardProps = useCallback<Required<ArtifactCardGridProps>['cardComponentProps']>(
    (item) => {
      return cardProps.get(item as Immutable<TrustedApp>)!;
    },
    [cardProps]
  );

  // Anytime a new set of data (trusted apps) is retrieved, reset the card expand state
  useEffect(() => {
    setCardExpanded({});
  }, [trustedAppItems]);

  if (hasTrustedApps.loading) {
    return (
      <div>
        <EuiLoadingSpinner className="essentialAnimation" size="xl" />
      </div>
    );
  }

  if (!hasTrustedApps.hasTrustedApps) {
    // TODO: implement empty state (task #1645)
    return <div>{'No trusted application'}</div>;
  }

  return (
    <>
      <ArtifactCardGrid
        items={trustedAppItems}
        onPageChange={handlePageChange}
        onExpandCollapse={handleExpandCollapse}
        cardComponentProps={provideCardProps}
        loading={isLoading}
        pagination={pagination as Pagination}
      />
    </>
  );
});
PolicyTrustedAppsList.displayName = 'PolicyTrustedAppsList';
