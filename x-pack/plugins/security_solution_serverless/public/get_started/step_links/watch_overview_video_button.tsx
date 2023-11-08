/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useModalContext } from '../../common/hooks/modal_context';
import { WATCH_OVERVIEW_VIDEO_HEADER } from '../translations';
import { QuickStart } from '../types';

const WatchOverviewButtonComponent: React.FC<{ title?: string }> = ({ title }) => {
  const { openModal, toggleFinishedCard } = useModalContext();
  const onClick = useCallback(() => {
    openModal();
    toggleFinishedCard({ cardId: QuickStart.watchTheOverviewVideo });
  }, [openModal, toggleFinishedCard]);

  return <EuiButton onClick={onClick}>{title ?? WATCH_OVERVIEW_VIDEO_HEADER}</EuiButton>;
};

export const WatchOverviewButton = React.memo(WatchOverviewButtonComponent);
