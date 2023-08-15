/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { IconPosition } from '@kbn/expression-xy-plugin/common';
import { TooltipWrapper } from '@kbn/visualization-ui-components';
import { YAxisMode } from '../../types';

import { idPrefix } from '../dimension_editor';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

interface LabelConfigurationOptions {
  isHorizontal: boolean;
  axisMode?: YAxisMode;
}

const topLabel = i18n.translate('xpack.lens.xyChart.markerPosition.above', {
  defaultMessage: 'Top',
});
const bottomLabel = i18n.translate('xpack.lens.xyChart.markerPosition.below', {
  defaultMessage: 'Bottom',
});
const leftLabel = i18n.translate('xpack.lens.xyChart.markerPosition.left', {
  defaultMessage: 'Left',
});
const rightLabel = i18n.translate('xpack.lens.xyChart.markerPosition.right', {
  defaultMessage: 'Right',
});

function getIconPositionOptions({ isHorizontal, axisMode }: LabelConfigurationOptions) {
  const autoOption = {
    id: `${idPrefix}auto`,
    label: i18n.translate('xpack.lens.xyChart.lineMarker.auto', {
      defaultMessage: 'Auto',
    }),
    'data-test-subj': 'lnsXY_markerPosition_auto',
  };

  if (axisMode === 'bottom') {
    return [
      {
        id: `${idPrefix}below`,
        label: isHorizontal ? leftLabel : bottomLabel,
        'data-test-subj': 'lnsXY_markerPosition_below',
      },
      autoOption,
      {
        id: `${idPrefix}above`,
        label: isHorizontal ? rightLabel : topLabel,
        'data-test-subj': 'lnsXY_markerPosition_above',
      },
    ];
  }
  return [
    {
      id: `${idPrefix}left`,
      label: isHorizontal ? bottomLabel : leftLabel,
      'data-test-subj': 'lnsXY_markerPosition_left',
    },
    autoOption,
    {
      id: `${idPrefix}right`,
      label: isHorizontal ? topLabel : rightLabel,
      'data-test-subj': 'lnsXY_markerPosition_right',
    },
  ];
}

export interface MarkerDecorationConfig<T extends string = string> {
  axisMode?: YAxisMode;
  icon?: T;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
  textField?: string;
}

export function MarkerDecorationPosition<Icon extends string = string>({
  currentConfig,
  setConfig,
  isHorizontal,
}: {
  currentConfig?: MarkerDecorationConfig<Icon>;
  setConfig: (config: MarkerDecorationConfig<Icon>) => void;
  isHorizontal: boolean;
}) {
  return (
    <>
      {hasIcon(currentConfig?.icon) || currentConfig?.textVisibility ? (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          isDisabled={!hasIcon(currentConfig?.icon) && !currentConfig?.textVisibility}
          label={i18n.translate('xpack.lens.xyChart.lineMarker.position', {
            defaultMessage: 'Decoration position',
          })}
        >
          <TooltipWrapper
            tooltipContent={i18n.translate('xpack.lens.lineMarker.positionRequirementTooltip', {
              defaultMessage:
                'You must select an icon or show the name in order to alter its position',
            })}
            condition={!hasIcon(currentConfig?.icon) && !currentConfig?.textVisibility}
            position="top"
            delay="regular"
            display="block"
          >
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.xyChart.lineMarker.position', {
                defaultMessage: 'Decoration position',
              })}
              data-test-subj="lnsXY_markerPosition"
              name="markerPosition"
              isDisabled={!hasIcon(currentConfig?.icon) && !currentConfig?.textVisibility}
              buttonSize="compressed"
              options={getIconPositionOptions({
                isHorizontal,
                axisMode: currentConfig!.axisMode,
              })}
              idSelected={`${idPrefix}${currentConfig?.iconPosition || 'auto'}`}
              onChange={(id) => {
                const newMode = id.replace(idPrefix, '') as IconPosition;
                setConfig({ iconPosition: newMode });
              }}
            />
          </TooltipWrapper>
        </EuiFormRow>
      ) : null}
    </>
  );
}
