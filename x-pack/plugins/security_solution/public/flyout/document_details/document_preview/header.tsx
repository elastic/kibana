/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { AlertHeaderTitle } from './components/alert_header_title';
import { EventHeaderTitle } from './components/event_header_title';
import { useDocumentPreviewPanelContext } from './context';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';

export const PanelHeader: FC = memo(() => {
  const { dataFormattedForFieldBrowser } = useDocumentPreviewPanelContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  return <FlyoutHeader>{isAlert ? <AlertHeaderTitle /> : <EventHeaderTitle />}</FlyoutHeader>;
});

PanelHeader.displayName = 'PanelHeader';
