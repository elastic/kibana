/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../../../public/lib/ui_metric';
import { CANVAS_APP } from '../../../../common/lib';
import { ElementMenu as Component, Props } from './element_menu.component';
import { useEmbeddablesService } from '../../../services';

export const ElementMenu: FC<Omit<Props, 'createNewEmbeddable'>> = (props) => {
  const embeddablesService = useEmbeddablesService();
  const stateTransferService = embeddablesService.getStateTransfer();
  const { pathname, search } = useLocation();

  const createNewEmbeddable = useCallback(() => {
    const path = '#/';
    const appId = 'lens';

    if (trackCanvasUiMetric) {
      trackCanvasUiMetric(METRIC_TYPE.CLICK, `${appId}:create`);
    }

    stateTransferService.navigateToEditor(appId, {
      path,
      state: {
        originatingApp: CANVAS_APP,
        originatingPath: `#/${pathname}${search}`,
      },
    });
  }, [pathname, search, stateTransferService]);

  return <Component {...props} createNewEmbeddable={createNewEmbeddable} />;
};
