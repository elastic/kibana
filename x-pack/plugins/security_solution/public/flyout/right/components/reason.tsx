/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { REASON_DETAILS_TEST_ID, REASON_TITLE_TEST_ID } from './test_ids';
import { ALERT_REASON_TITLE, DOCUMENT_REASON_TITLE } from './translations';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { getRowRenderer } from '../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { useRightPanelContext } from '../context';

/**
 * Displays the information provided by the rowRenderer. Supports multiple types of documents.
 */
export const Reason: FC = () => {
  const { dataAsNestedObject, dataFormattedForFieldBrowser } = useRightPanelContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const renderer = useMemo(
    () =>
      dataAsNestedObject != null
        ? getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers })
        : null,
    [dataAsNestedObject]
  );

  if (!dataFormattedForFieldBrowser || !dataAsNestedObject || !renderer) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={REASON_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>{isAlert ? ALERT_REASON_TITLE : DOCUMENT_REASON_TITLE}</h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={REASON_DETAILS_TEST_ID}>
        {renderer.renderRow({
          contextId: 'event-details',
          data: dataAsNestedObject,
          isDraggable: false,
          scopeId: 'global',
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

Reason.displayName = 'Reason';
