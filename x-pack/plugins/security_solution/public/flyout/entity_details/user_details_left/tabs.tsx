/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { getRiskInputTab } from '../../../entity_analytics/components/entity_details_flyout';
import { UserAssetTableType } from '../../../explore/users/store/model';
import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import type {
  ManagedUserHits,
  ManagedUserHit,
} from '../../../../common/search_strategy/security_solution/users/managed_details';
import { ENTRA_TAB_TEST_ID, OKTA_TAB_TEST_ID } from './test_ids';
import { AssetDocumentTab } from './tabs/asset_document';
import { RightPanelProvider } from '../../document_details/right/context';

export type LeftPanelTabsType = Array<{
  id: UserDetailsLeftPanelTab;
  'data-test-subj': string;
  name: ReactElement;
  content: React.ReactElement;
}>;

export enum UserDetailsLeftPanelTab {
  RISK_INPUTS = 'risk_inputs',
  OKTA = 'okta_document',
  ENTRA = 'entra_document',
}

export const useTabs = (managedUser: ManagedUserHits, alertIds: string[]): LeftPanelTabsType =>
  useMemo(() => {
    const tabs: LeftPanelTabsType = [];
    const entraManagedUser = managedUser[ManagedUserDatasetKey.ENTRA];
    const oktaManagedUser = managedUser[ManagedUserDatasetKey.OKTA];

    if (alertIds.length > 0) {
      tabs.push(getRiskInputTab(alertIds));
    }

    if (oktaManagedUser) {
      tabs.push(getOktaTab(oktaManagedUser));
    }

    if (entraManagedUser) {
      tabs.push(getEntraTab(entraManagedUser));
    }

    return tabs;
  }, [alertIds, managedUser]);

const getOktaTab = (oktaManagedUser: ManagedUserHit) => ({
  id: UserDetailsLeftPanelTab.OKTA,
  'data-test-subj': OKTA_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.userDetails.okta.tabLabel"
      defaultMessage="Okta Data"
    />
  ),
  content: (
    <RightPanelProvider
      id={oktaManagedUser._id}
      indexName={oktaManagedUser._index}
      scopeId={UserAssetTableType.assetOkta}
    >
      <AssetDocumentTab />
    </RightPanelProvider>
  ),
});

const getEntraTab = (entraManagedUser: ManagedUserHit) => {
  return {
    id: UserDetailsLeftPanelTab.ENTRA,
    'data-test-subj': ENTRA_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.userDetails.entra.tabLabel"
        defaultMessage="Entra Data"
      />
    ),
    content: (
      <RightPanelProvider
        id={entraManagedUser._id}
        indexName={entraManagedUser._index}
        scopeId={UserAssetTableType.assetEntra}
      >
        <AssetDocumentTab />
      </RightPanelProvider>
    ),
  };
};
