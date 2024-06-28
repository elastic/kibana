/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback } from 'react';

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiLink } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { DocumentDetailsPreviewPanelKey } from '../constants/panel_keys';
import { ALERT_PREVIEW_BANNER } from '../../preview';
import { CORRELATIONS_DETAILS_ALERT_LINK_TEST_ID } from '../../left/components/test_ids';

interface RuleLinkProps {
  /**
   * Rule name of the alert
   */
  ruleName: string;
  /**
   * Id of the document
   */
  id: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;

  scopeId: string;
}

export const RuleLink: FC<RuleLinkProps> = ({ ruleName, id, indexName, scopeId }) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const isPreviewEnabled = useIsExperimentalFeatureEnabled('entityAlertPreviewEnabled');

  const openAlertPreview = useCallback(
    () =>
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id,
          indexName,
          scopeId,
          isPreviewMode: true,
          banner: ALERT_PREVIEW_BANNER,
        },
      }),
    [openPreviewPanel, id, indexName, scopeId]
  );

  return isPreviewEnabled ? (
    <EuiLink data-test-subj={CORRELATIONS_DETAILS_ALERT_LINK_TEST_ID} onClick={openAlertPreview}>
      {ruleName}
    </EuiLink>
  ) : (
    <span>{ruleName}</span>
  );
};
