/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactElement } from 'react';
import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useTGridComponentState } from '../../../methods/context';

export const useActionItems: AlertsTableConfigurationRegistry['useActionsColumn'] = () => {
  const { customActionsColum } = useTGridComponentState();
  return {
    renderCustomActionsRow: ({
      // TODO: right now, data is bound in the renderer.
      // We might want to move away from that pattern in
      // the future and read data from the following props:
      // alert,
      // setFlyoutAlert,
      // id,
      rowIndex,
      colIndex,
      columnId,
      isDetails,
      isExpandable,
      isExpanded,
      setCellProps,
    }) => {
      if (!customActionsColum) {
        return <></>;
      } else {
        return customActionsColum.renderer({
          colIndex,
          columnId,
          isDetails,
          isExpandable,
          isExpanded,
          rowIndex,
          setCellProps,
        }) as ReactElement;
      }
    },
    width: customActionsColum ? customActionsColum.width : 0,
  };
};
