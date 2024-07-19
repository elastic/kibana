/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAssetBasePath } from '../../hooks/use_asset_basepath';
import { useUsageTracker } from '../../hooks/use_usage_tracker';

export interface IndicesEmptyStateProps {
  onCreateIndex: () => void;
}
export const IndicesEmptyState = ({ onCreateIndex }: IndicesEmptyStateProps) => {
  const assetBasePath = useAssetBasePath();
  const usageTracker = useUsageTracker();
  const noDataImage = `${assetBasePath}/no_data.png`;
  const onAddDataClick = useCallback(() => {
    usageTracker.click('empty-indices-add-data');
    onCreateIndex();
  }, [usageTracker, onCreateIndex]);

  return (
    <EuiFlexGroup direction="column" alignItems="center" style={{ width: '100%' }}>
      <EuiFlexItem style={{ alignItems: 'center', padding: '2rem' }}>
        <EuiImage
          size="s"
          alt={i18n.translate('xpack.searchHomepage.indicesCard.emptyState.graphic.altText', {
            defaultMessage: 'No data available graphic',
          })}
          src={noDataImage}
        />
      </EuiFlexItem>
      <EuiTitle size="s">
        <EuiText>
          <FormattedMessage
            id="xpack.searchHomepage.indicesCard.emptyState.cta.title"
            defaultMessage="Nothing here, yet"
          />
        </EuiText>
      </EuiTitle>
      <EuiText color="subdued" style={{ maxWidth: '20rem' }} textAlign="center">
        <FormattedMessage
          id="xpack.searchHomepage.indicesCard.emptyState.cta.description"
          defaultMessage="Create your first index to start searching your data in Elastic"
        />
      </EuiText>
      <EuiButton
        fill
        color="primary"
        iconType="plusInCircleFilled"
        onClick={onAddDataClick}
        data-test-subj="indicesCard-add-data-button"
      >
        <FormattedMessage
          id="xpack.searchHomepage.indicesCard.emptyState.cta.text"
          defaultMessage="Add Data"
        />
      </EuiButton>
      <EuiSpacer size="xs" />
    </EuiFlexGroup>
  );
};
