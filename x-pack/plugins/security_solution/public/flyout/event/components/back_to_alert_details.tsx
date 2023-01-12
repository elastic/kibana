/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useExpandableFlyoutContext } from '../../context';

import { EventDetailsPanelKey } from '../panels/event';

export const BackToAlertDetailsButton = () => {
  const { updateFlyoutPanels } = useExpandableFlyoutContext();
  const onClick = useCallback(
    () =>
      updateFlyoutPanels({
        right: { panelKind: EventDetailsPanelKey },
      }),
    [updateFlyoutPanels]
  );
  return (
    <EuiButtonEmpty onClick={onClick} iconType="arrowLeft">
      {'Back to alert details'}
    </EuiButtonEmpty>
  );
};
