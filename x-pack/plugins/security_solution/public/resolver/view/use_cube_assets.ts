/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ButtonColor } from '@elastic/eui';
import euiThemeAmsterdamDark from '@elastic/eui/dist/eui_theme_amsterdam_dark.json';
import euiThemeAmsterdamLight from '@elastic/eui/dist/eui_theme_amsterdam_light.json';
import { useMemo } from 'react';
import { ResolverProcessType, CubeState } from '../types';
import { useUiSetting } from '../../../../../../src/plugins/kibana_react/public';
import { useSymbolIDs } from './use_symbol_ids';
import { useColors } from './use_colors';

/**
 * Provides colors and HTML IDs used to render the 'cube' graphic that accompanies nodes.
 */
export function useCubeAssets(cubeType: CubeState, isProcessTrigger: boolean): NodeStyleConfig {
  const SymbolIds = useSymbolIDs();
  const isDarkMode = useUiSetting('theme:darkMode');
  const theme = isDarkMode ? euiThemeAmsterdamDark : euiThemeAmsterdamLight;
  const colorMap = useColors();

  const nodeAssets: NodeStyleMap = useMemo(
    () => ({
      runningProcessCube: {
        backingFill: colorMap.processBackingFill,
        cubeSymbol: `#${SymbolIds.runningProcessCube}`,
        descriptionFill: colorMap.descriptionText,
        descriptionText: i18n.translate('xpack.securitySolution.endpoint.resolver.runningProcess', {
          defaultMessage: 'Running Process',
        }),
        isLabelFilled: true,
        labelButtonFill: 'primary',
        strokeColor: theme.euiColorPrimary,
      },
      loadingCube: {
        backingFill: colorMap.processBackingFill,
        cubeSymbol: `#${SymbolIds.loadingCube}`,
        descriptionFill: colorMap.descriptionText,
        descriptionText: i18n.translate('xpack.securitySolution.endpoint.resolver.loadingProcess', {
          defaultMessage: 'Loading Process',
        }),
        isLabelFilled: false,
        labelButtonFill: 'primary',
        strokeColor: theme.euiColorPrimary,
      },
      runningTriggerCube: {
        backingFill: colorMap.triggerBackingFill,
        cubeSymbol: `#${SymbolIds.runningTriggerCube}`,
        descriptionFill: colorMap.descriptionText,
        descriptionText: i18n.translate('xpack.securitySolution.endpoint.resolver.runningTrigger', {
          defaultMessage: 'Running Trigger',
        }),
        isLabelFilled: true,
        labelButtonFill: 'danger',
        strokeColor: theme.euiColorDanger,
      },
      terminatedProcessCube: {
        backingFill: colorMap.processBackingFill,
        cubeSymbol: `#${SymbolIds.terminatedProcessCube}`,
        descriptionFill: colorMap.descriptionText,
        descriptionText: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.terminatedProcess',
          {
            defaultMessage: 'Terminated Process',
          }
        ),
        isLabelFilled: false,
        labelButtonFill: 'primary',
        strokeColor: theme.euiColorPrimary,
      },
      terminatedTriggerCube: {
        backingFill: colorMap.triggerBackingFill,
        cubeSymbol: `#${SymbolIds.terminatedTriggerCube}`,
        descriptionFill: colorMap.descriptionText,
        descriptionText: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.terminatedTrigger',
          {
            defaultMessage: 'Terminated Trigger',
          }
        ),
        isLabelFilled: false,
        labelButtonFill: 'danger',
        strokeColor: theme.euiColorDanger,
      },
    }),
    [SymbolIds, colorMap, theme]
  );

  if (cubeType === 'terminated') {
    if (isProcessTrigger) {
      return nodeAssets.terminatedTriggerCube;
    } else {
      return nodeAssets[processTypeToCube.processTerminated];
    }
  } else if (cubeType === 'running') {
    if (isProcessTrigger) {
      return nodeAssets[processTypeToCube.processCausedAlert];
    } else {
      return nodeAssets[processTypeToCube.processRan];
    }
  } else {
    return nodeAssets[processTypeToCube.processLoading];
  }
}

const processTypeToCube: Record<ResolverProcessType, keyof NodeStyleMap> = {
  processCreated: 'runningProcessCube',
  processRan: 'runningProcessCube',
  processTerminated: 'terminatedProcessCube',
  unknownProcessEvent: 'runningProcessCube',
  processCausedAlert: 'runningTriggerCube',
  processLoading: 'loadingCube',
  unknownEvent: 'runningProcessCube',
};
interface NodeStyleMap {
  runningProcessCube: NodeStyleConfig;
  runningTriggerCube: NodeStyleConfig;
  terminatedProcessCube: NodeStyleConfig;
  terminatedTriggerCube: NodeStyleConfig;
  loadingCube: NodeStyleConfig;
}
interface NodeStyleConfig {
  backingFill: string;
  cubeSymbol: string;
  descriptionFill: string;
  descriptionText: string;
  isLabelFilled: boolean;
  labelButtonFill: ButtonColor;
  strokeColor: string;
}
