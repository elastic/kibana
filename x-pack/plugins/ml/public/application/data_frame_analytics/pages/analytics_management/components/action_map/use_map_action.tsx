/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { useMlLocator, useNavigateToPath } from '../../../../../contexts/kibana';
import { DataFrameAnalyticsListAction, DataFrameAnalyticsListRow } from '../analytics_list/common';
import { ML_PAGES } from '../../../../../../../common/constants/locator';
import { getViewLinkStatus } from '../action_view/get_view_link_status';
import { useUrlState } from '../../../../../util/url_state';

import { mapActionButtonText, MapButton } from './map_button';

export type MapAction = ReturnType<typeof useMapAction>;
export const useMapAction = () => {
  const mlLocator = useMlLocator()!;
  const navigateToPath = useNavigateToPath();

  const [globalState] = useUrlState('_g');

  const clickHandler = useCallback(
    async (item: DataFrameAnalyticsListRow) => {
      const globalStateClone = cloneDeep(globalState || {});
      delete globalStateClone.ml;

      const path = await mlLocator.getUrl({
        page: ML_PAGES.DATA_FRAME_ANALYTICS_MAP,
        pageState: {
          jobId: item.id,
          globalState: globalStateClone,
        },
      });

      await navigateToPath(path, false);
    },
    [globalState]
  );

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      isPrimary: true,
      name: (item: DataFrameAnalyticsListRow) => <MapButton item={item} />,
      enabled: (item: DataFrameAnalyticsListRow) => !getViewLinkStatus(item).disabled,
      description: mapActionButtonText,
      icon: 'graphApp',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'mlAnalyticsJobMapButton',
    }),
    [clickHandler]
  );

  return { action };
};
