/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutFooter } from '../../shared/components/flyout_footer';
import { DocumentDetailsRightPanelKey } from '../shared/constants/panel_keys';
import { useDocumentDetailsContext } from '../shared/context';
import { PREVIEW_FOOTER_TEST_ID, PREVIEW_FOOTER_LINK_TEST_ID } from './test_ids';

/**
 * Footer at the bottom of preview panel with a link to open document details flyout
 */
export const PreviewPanelFooter = () => {
  const { eventId, indexName, scopeId } = useDocumentDetailsContext();
  const { openFlyout } = useExpandableFlyoutApi();

  const openDocumentFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      },
    });
  }, [openFlyout, eventId, indexName, scopeId]);

  return (
    <FlyoutFooter data-test-subj={PREVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={openDocumentFlyout}
            target="_blank"
            data-test-subj={PREVIEW_FOOTER_LINK_TEST_ID}
          >
            {i18n.translate('xpack.securitySolution.flyout.preview.openFlyoutLabel', {
              defaultMessage: 'Show full alert details',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
};
