/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSTANTS } from './constants';
import { decodeRisonUrlState, getQueryStringKeyValue } from './helpers';
import { ToggleDetailPanel } from '../../../../common/types/timeline';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { useDeepEqualSelector } from '../../hooks/use_selector';

interface UseInitializeDetailPanel {
  detailPanel: ToggleDetailPanel | null;
  wasTimelineCreated: boolean;
}
export const useInitializeDetailPanel = (): UseInitializeDetailPanel => {
  const { search } = useLocation();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const urlDetailPanel = useMemo(
    () =>
      decodeRisonUrlState<ToggleDetailPanel>(
        getQueryStringKeyValue({
          search,
          urlKey: CONSTANTS.detailPanel,
        }) ?? undefined
      ),
    [search]
  );
  const timelineId = urlDetailPanel?.timelineId ?? '';
  const existingTimeline = useDeepEqualSelector((state) => getTimeline(state, timelineId));
  return { detailPanel: urlDetailPanel, wasTimelineCreated: existingTimeline != null };
};
