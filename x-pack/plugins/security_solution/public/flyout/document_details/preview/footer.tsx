/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutFooter } from '@kbn/security-solution-common';
import { getField } from '../shared/utils';
import { EventKind } from '../shared/constants/event_kinds';
import { DocumentDetailsRightPanelKey } from '../shared/constants/panel_keys';
import { useDocumentDetailsContext } from '../shared/context';
import { PREVIEW_FOOTER_TEST_ID, PREVIEW_FOOTER_LINK_TEST_ID } from './test_ids';
import { useKibana } from '../../../common/lib/kibana';

/**
 * Footer at the bottom of preview panel with a link to open document details flyout
 */
export const PreviewPanelFooter = () => {
  const { eventId, indexName, scopeId, getFieldsData } = useDocumentDetailsContext();
  const { openFlyout } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;

  const isAlert = useMemo(
    () => getField(getFieldsData('event.kind')) === EventKind.signal,
    [getFieldsData]
  );

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
    telemetry.reportDetailsFlyoutOpened({
      location: scopeId,
      panel: 'right',
    });
  }, [openFlyout, eventId, indexName, scopeId, telemetry]);

  return (
    <FlyoutFooter data-test-subj={PREVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={openDocumentFlyout}
            target="_blank"
            data-test-subj={PREVIEW_FOOTER_LINK_TEST_ID}
          >
            <>
              {i18n.translate('xpack.securitySolution.flyout.preview.openFlyoutLabel', {
                values: { isAlert },
                defaultMessage: 'Show full {isAlert, select, true{alert} other{event}} details',
              })}
            </>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
};
