/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  getInsightsInputTab,
  getRiskInputTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import { UserAssetTableType } from '../../../explore/users/store/model';
import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import type {
  ManagedUserHits,
  ManagedUserHit,
} from '../../../../common/search_strategy/security_solution/users/managed_details';
import { ENTRA_TAB_TEST_ID, OKTA_TAB_TEST_ID } from './test_ids';
import { AssetDocumentTab } from './tabs/asset_document';
import { DocumentDetailsProvider } from '../../document_details/shared/context';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import type { LeftPanelTabsType } from '../shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

export const useTabs = (
  managedUser: ManagedUserHits,
  name: string,
  isRiskScoreExist: boolean,
  scopeId: string,
  hasMisconfigurationFindings?: boolean
): LeftPanelTabsType =>
  useMemo(() => {
    const tabs: LeftPanelTabsType = [];
    const entraManagedUser = managedUser[ManagedUserDatasetKey.ENTRA];
    const oktaManagedUser = managedUser[ManagedUserDatasetKey.OKTA];

    if (isRiskScoreExist) {
      tabs.push(
        getRiskInputTab({
          entityName: name,
          entityType: RiskScoreEntity.user,
          scopeId,
        })
      );
    }

    if (oktaManagedUser) {
      tabs.push(getOktaTab(oktaManagedUser));
    }

    if (entraManagedUser) {
      tabs.push(getEntraTab(entraManagedUser));
    }

    if (hasMisconfigurationFindings) {
      tabs.push(getInsightsInputTab({ name, fieldName: 'user.name' }));
    }

    return tabs;
  }, [hasMisconfigurationFindings, isRiskScoreExist, managedUser, name, scopeId]);

const getOktaTab = (oktaManagedUser: ManagedUserHit) => ({
  id: EntityDetailsLeftPanelTab.OKTA,
  'data-test-subj': OKTA_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.userDetails.okta.tabLabel"
      defaultMessage="Okta Data"
    />
  ),
  content: (
    <DocumentDetailsProvider
      id={oktaManagedUser._id}
      indexName={oktaManagedUser._index}
      scopeId={UserAssetTableType.assetOkta}
    >
      <AssetDocumentTab />
    </DocumentDetailsProvider>
  ),
});

const getEntraTab = (entraManagedUser: ManagedUserHit) => {
  return {
    id: EntityDetailsLeftPanelTab.ENTRA,
    'data-test-subj': ENTRA_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.userDetails.entra.tabLabel"
        defaultMessage="Entra Data"
      />
    ),
    content: (
      <DocumentDetailsProvider
        id={entraManagedUser._id}
        indexName={entraManagedUser._index}
        scopeId={UserAssetTableType.assetEntra}
      >
        <AssetDocumentTab />
      </DocumentDetailsProvider>
    ),
  };
};
