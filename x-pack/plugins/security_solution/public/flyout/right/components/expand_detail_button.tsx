/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { COLLAPSE_DETAILS_BUTTON_TEST_ID, EXPAND_DETAILS_BUTTON_TEST_ID } from './test_ids';
import { LeftPanelKey } from '../../left';
import { useRightPanelContext } from '../context';
import { COLLAPSE_DETAILS_BUTTON, EXPAND_DETAILS_BUTTON } from './translations';

/**
 * Button displayed in the top left corner of the panel, to expand the left section of the document details expandable flyout
 */
export const ExpandDetailButton: FC = memo(() => {
  const { closeLeftPanel, openLeftPanel, panels } = useExpandableFlyoutContext();
  const isExpanded: boolean = panels.left != null;

  const { eventId, indexName, scopeId } = useRightPanelContext();

  const expandDetails = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  const collapseDetails = useCallback(() => closeLeftPanel(), [closeLeftPanel]);

  return isExpanded ? (
    <EuiButtonEmpty
      iconSide="left"
      onClick={collapseDetails}
      iconType="arrowEnd"
      data-test-subj={COLLAPSE_DETAILS_BUTTON_TEST_ID}
    >
      {COLLAPSE_DETAILS_BUTTON}
    </EuiButtonEmpty>
  ) : (
    <EuiButtonEmpty
      iconSide="left"
      onClick={expandDetails}
      iconType="arrowStart"
      data-test-subj={EXPAND_DETAILS_BUTTON_TEST_ID}
    >
      {EXPAND_DETAILS_BUTTON}
    </EuiButtonEmpty>
  );
});

ExpandDetailButton.displayName = 'ExpandDetailButton';
