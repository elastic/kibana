/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { useContext, useEffect } from 'react';
import { euiLightVars as themeLight, euiDarkVars as themeDark } from '@kbn/ui-theme';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { Indicator } from '../../../../../common/types/indicator';
import { IndicatorFieldValue } from '../indicator_field_value/indicator_field_value';
import { IndicatorsTableContext } from './context';
import { ActionsRowCell } from './actions_row_cell';

export const cellRendererFactory = (from: number) => {
  return ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
    const indicatorsTableContext = useContext(IndicatorsTableContext);

    if (!indicatorsTableContext) {
      throw new Error('this can only be used inside indicators table');
    }

    const {
      services: { uiSettings },
    } = useKibana();

    const darkMode = uiSettings.get('theme:darkMode');

    const { indicators, expanded } = indicatorsTableContext;

    const indicator: Indicator | undefined = indicators[rowIndex - from];

    useEffect(() => {
      if (expanded && indicator && expanded._id === indicator._id) {
        setCellProps({
          style: {
            backgroundColor: darkMode ? themeDark.euiColorHighlight : themeLight.euiColorHighlight,
          },
        });
      } else {
        setCellProps({ style: undefined });
      }
    }, [darkMode, expanded, indicator, setCellProps]);

    if (!indicator) {
      return null;
    }

    if (columnId === 'Actions') {
      return <ActionsRowCell indicator={indicator} />;
    }

    return <IndicatorFieldValue indicator={indicator} field={columnId} />;
  };
};
