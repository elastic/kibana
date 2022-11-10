/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { IconPosition } from '@kbn/expression-xy-plugin/common';
import { YAxisMode } from '../../types';

import { TooltipWrapper } from '../../../../shared_components';
import { hasIcon, IconSelect, IconSet } from './icon_select';
import { idPrefix } from '../dimension_editor';

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

function getSelectedOption(
  { textField, textVisibility }: MarkerDecorationConfig = {},
  isQueryBased?: boolean
) {
  if (!textVisibility) {
    return 'none';
  }
  if (isQueryBased && textField) {
    return 'field';
  }
  return 'name';
}

export function TextDecorationSetting<Icon extends string = string>({
  currentConfig,
  setConfig,
  isQueryBased,
  children,
}: {
  currentConfig?: MarkerDecorationConfig<Icon>;
  setConfig: (config: MarkerDecorationConfig<Icon>) => void;
  isQueryBased?: boolean;
  /** A children render function for custom sub fields on textDecoration change */
  children?: (textDecoration: 'none' | 'name' | 'field') => JSX.Element | null;
}) {
  // To model the temporary state for label based on field when user didn't pick up the field yet,
  // use a local state
  const [selectedVisibleOption, setVisibleOption] = useState<'none' | 'name' | 'field'>(
    getSelectedOption(currentConfig, isQueryBased)
  );
  const options = [
    {
      id: `${idPrefix}none`,
      label: i18n.translate('xpack.lens.xyChart.lineMarker.textVisibility.none', {
        defaultMessage: 'None',
      }),
      'data-test-subj': 'lnsXY_textVisibility_none',
    },
    {
      id: `${idPrefix}name`,
      label: i18n.translate('xpack.lens.xyChart.lineMarker.textVisibility.name', {
        defaultMessage: 'Name',
      }),
      'data-test-subj': 'lnsXY_textVisibility_name',
    },
  ];
  if (isQueryBased) {
    options.push({
      id: `${idPrefix}field`,
      label: i18n.translate('xpack.lens.xyChart.lineMarker.textVisibility.field', {
        defaultMessage: 'Field',
      }),
      'data-test-subj': 'lnsXY_textVisibility_field',
    });
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.lineMarker.textVisibility', {
        defaultMessage: 'Text decoration',
      })}
      display="columnCompressed"
      fullWidth
    >
      <div>
        <EuiButtonGroup
          legend={i18n.translate('xpack.lens.lineMarker.textVisibility', {
            defaultMessage: 'Text decoration',
          })}
          data-test-subj="lns-lineMarker-text-visibility"
          name="textVisibilityStyle"
          buttonSize="compressed"
          options={options}
          idSelected={
            selectedVisibleOption ? `${idPrefix}${selectedVisibleOption}` : `${idPrefix}none`
          }
          onChange={(id) => {
            const chosenOption = id.replace(idPrefix, '') as 'none' | 'name' | 'field';
            if (chosenOption === 'none') {
              setConfig({
                textVisibility: false,
                textField: undefined,
              });
            } else if (chosenOption === 'name') {
              setConfig({
                textVisibility: true,
                textField: undefined,
              });
            } else if (chosenOption === 'field') {
              setConfig({
                textVisibility: Boolean(currentConfig?.textField),
              });
            }

            setVisibleOption(chosenOption);
          }}
          isFullWidth
        />
        {children?.(selectedVisibleOption)}
      </div>
    </EuiFormRow>
  );
}

export function IconSelectSetting<Icon extends string = string>({
  currentConfig,
  setConfig,
  customIconSet,
  defaultIcon = 'empty',
}: {
  currentConfig?: MarkerDecorationConfig<Icon>;
  setConfig: (config: MarkerDecorationConfig<Icon>) => void;
  customIconSet: IconSet<Icon>;
  defaultIcon?: string;
}) {
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.xyChart.lineMarker.icon', {
        defaultMessage: 'Icon decoration',
      })}
    >
      <IconSelect
        defaultIcon={defaultIcon}
        customIconSet={customIconSet}
        value={currentConfig?.icon}
        onChange={(newIcon) => {
          setConfig({ icon: newIcon });
        }}
      />
    </EuiFormRow>
  );
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
