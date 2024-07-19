/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantAvatar, UpgradeButtons, useAssistantContext } from '@kbn/elastic-assistant';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { ProductTier } from '../../../common/components/landing_page/onboarding/configs';
import * as i18n from './translations';

interface Props {
  productTier: ProductTier | undefined;
}

const UpgradeComponent: React.FC<Props> = ({ productTier }) => {
  const { http } = useAssistantContext();

  const title = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem data-test-subj="assistantAvatar" grow={false}>
          <AssistantAvatar size="m" />
          <EuiSpacer size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
            <EuiFlexItem data-test-subj="upgradeTitle" grow={false}>
              <span>{i18n.FIND_POTENTIAL_ATTACKS_WITH_AI}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const body = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="attackDiscoveryIsAvailable">
            {productTier == null
              ? i18n.ATTACK_DISCOVERY_IS_AVAILABLE
              : i18n.YOUR_PRODUCT_TIER_DOES_NOT_SUPPORT}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="pleaseUpgrade">
            {productTier == null ? i18n.PLEASE_UPGRADE : i18n.PLEASE_UPGRADE_YOUR_PRODUCT_TIER}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [productTier]
  );

  const actions = useMemo(
    () =>
      productTier == null ? (
        <EuiFlexGroup justifyContent="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <UpgradeButtons basePath={http.basePath.get()} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null,
    [http.basePath, productTier]
  );

  return <EuiEmptyPrompt actions={actions} body={body} data-test-subj="upgrade" title={title} />;
};

export const Upgrade = React.memo(UpgradeComponent);
