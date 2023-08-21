/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ALERT_REASON_TITLE } from './translations';
import { ALERT_REASON_PREVIEW_BODY_TEST_ID } from './test_ids';
import { usePreviewPanelContext } from '../context';
import { getRowRenderer } from '../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';

/**
 * Alert reason renderer on a preview panel on top of the right section of expandable flyout
 */
export const AlertReasonPreview: React.FC = () => {
  const { dataAsNestedObject } = usePreviewPanelContext();

  const renderer = useMemo(
    () =>
      dataAsNestedObject != null
        ? getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers })
        : null,
    [dataAsNestedObject]
  );

  if (!dataAsNestedObject || !renderer) {
    return null;
  }

  return (
    <EuiPanel hasShadow={false} data-test-subj={ALERT_REASON_PREVIEW_BODY_TEST_ID}>
      <EuiTitle>
        <h6>{ALERT_REASON_TITLE}</h6>
      </EuiTitle>
      <EuiSpacer size="m" />
      {renderer.renderRow({
        contextId: 'event-details',
        data: dataAsNestedObject,
        isDraggable: false,
        scopeId: 'global',
      })}
    </EuiPanel>
  );
};

AlertReasonPreview.displayName = 'AlertReasonPreview';
