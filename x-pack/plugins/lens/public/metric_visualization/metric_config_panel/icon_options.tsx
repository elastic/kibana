/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiColorPicker, EuiFormRow } from '@elastic/eui';
import type { MetricState } from '../../../common/types';
import {
  defualtEuiIconSet,
  IconSelect,
} from '../../xy_visualization/xy_config_panel/shared/icon_select';

export interface IconProps {
  state: MetricState;
  setState: (newState: MetricState) => void;
}

const metricIconSet = [
  ...defualtEuiIconSet,
  {
    value: 'bullseye',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.bullseyeIconLabel', {
      defaultMessage: 'Bullseye',
    }),
  },
  {
    value: 'clock',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.clockIconLabel', {
      defaultMessage: 'clock',
    }),
  },
  {
    value: 'color',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.colorIconLabel', {
      defaultMessage: 'color',
    }),
  },
  {
    value: 'online',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.onlineIconLabel', {
      defaultMessage: 'online',
    }),
  },
  {
    value: 'training',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.trainingIconLabel', {
      defaultMessage: 'training',
    }),
  },
  {
    value: 'moon',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.moonIconLabel', {
      defaultMessage: 'moon',
    }),
  },
  {
    value: 'sun',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.sunIconLabel', {
      defaultMessage: 'sun',
    }),
  },
  {
    value: 'cloudSunny',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.cloudSunnyIconLabel', {
      defaultMessage: 'cloudSunny',
    }),
  },
  {
    value: 'cloudDrizzle',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.cloudDrizzleIconLabel', {
      defaultMessage: 'cloudDrizzle',
    }),
  },

  {
    value: 'cloudStormy',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.cloudStormyIconLabel', {
      defaultMessage: 'cloudStormy',
    }),
  },

  {
    value: 'paperClip',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.paperClipIconLabel', {
      defaultMessage: 'paperClip',
    }),
  },
  {
    value: 'wrench',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.wrenchIconLabel', {
      defaultMessage: 'wrench',
    }),
  },
  {
    value: 'user',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.userIconLabel', {
      defaultMessage: 'user',
    }),
  },
  {
    value: 'quote',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.quoteIconLabel', {
      defaultMessage: 'quote',
    }),
  },
];

// export const defualtEuiIconSet = [
//   {
//     value: 'empty',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.noIconLabel', {
//       defaultMessage: 'None',
//     }),
//   },
//   {
//     value: 'asterisk',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.asteriskIconLabel', {
//       defaultMessage: 'Asterisk',
//     }),
//   },
//   {
//     value: 'bell',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.bellIconLabel', {
//       defaultMessage: 'Bell',
//     }),
//   },
//   {
//     value: 'bolt',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.boltIconLabel', {
//       defaultMessage: 'Bolt',
//     }),
//   },
//   {
//     value: 'bug',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.bugIconLabel', {
//       defaultMessage: 'Bug',
//     }),
//   },
//   {
//     value: 'editorComment',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.commentIconLabel', {
//       defaultMessage: 'Comment',
//     }),
//   },
//   {
//     value: 'alert',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.alertIconLabel', {
//       defaultMessage: 'Alert',
//     }),
//   },
//   {
//     value: 'flag',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.flagIconLabel', {
//       defaultMessage: 'Flag',
//     }),
//   },
//   {
//     value: 'tag',
//     label: i18n.translate('xpack.lens.xyChart.iconSelect.tagIconLabel', {
//       defaultMessage: 'Tag',
//     }),
//   },
// ];

export const DEFAULT_TITLE_POSITION = 'top';

const iconPositionOptions = [
  {
    id: 'above',
    label: i18n.translate('xpack.lens.shared.legendIconPositionAbove', {
      defaultMessage: 'Above',
    }),
    iconType: 'arrowUp',
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.legendIconPositionRight', {
      defaultMessage: 'Right',
    }),
    iconType: 'arrowRight',
  },
  {
    id: 'below',
    label: i18n.translate('xpack.lens.shared.legendIconPositionBelow', {
      defaultMessage: 'Below',
    }),
    iconType: 'arrowDown',
  },
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.legendIconPositionLeft', {
      defaultMessage: 'Left',
    }),
    iconType: 'arrowLeft',
  },
];

export const IconOptions: React.FC<IconProps> = ({ state, setState }) => {
  const isEmptyIcon = state.iconType === 'empty' || !state.iconType;
  const backgroundOptions = [
    {
      id: 'none',
      label: i18n.translate('xpack.lens.metricChart.iconBgOptions.none', {
        defaultMessage: 'None',
      }),
    },
    {
      id: 'shadow',
      label: i18n.translate('xpack.lens.metricChart.iconBgOptions.shadow', {
        defaultMessage: 'Shadow',
      }),
    },
    {
      id: 'color',
      label: i18n.translate('xpack.lens.metricChart.iconBgOptions.color', {
        defaultMessage: 'Color',
      }),
      isDisabled: !state.iconColor,
    },
  ];
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metricChart.icon', {
          defaultMessage: 'Icon',
        })}
      >
        <IconSelect
          onChange={(value) => setState({ ...state, iconType: value })}
          value={state.iconType}
          customIconSet={metricIconSet}
        />
      </EuiFormRow>
      <EuiFormRow
        isDisabled={isEmptyIcon}
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metricChart.iconColor', {
          defaultMessage: 'Icon color',
        })}
      >
        <EuiColorPicker
          disabled={isEmptyIcon}
          compressed
          isClearable={Boolean(state.iconColor !== '#000')}
          onChange={(value) =>
            value
              ? setState({ ...state, iconColor: value, iconBackground: 'color' })
              : setState({ ...state, iconColor: '', iconBackground: 'shadow' })
          }
          color={state.iconColor}
          placeholder={i18n.translate('xpack.lens.metricChart.iconColor.default', {
            defaultMessage: 'Text color',
          })}
          aria-label={i18n.translate('xpack.lens.metricChart.iconColor.aria', {
            defaultMessage: 'Icon color',
          })}
        />
      </EuiFormRow>
      <EuiFormRow
        isDisabled={isEmptyIcon}
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metricChart.iconPositionLabel', {
          defaultMessage: 'Icon aligment',
        })}
      >
        <EuiButtonGroup
          isDisabled={isEmptyIcon}
          data-test-subj="lnsMissingValuesSelect"
          legend="This is a basic group"
          options={iconPositionOptions}
          idSelected={state.iconPosition ?? DEFAULT_TITLE_POSITION}
          onChange={(value) => {
            setState({ ...state, iconPosition: value as MetricState['iconPosition'] });
          }}
          buttonSize="compressed"
          isIconOnly
        />
      </EuiFormRow>
      <EuiFormRow
        isDisabled={isEmptyIcon}
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metricChart.iconBg', {
          defaultMessage: 'Icon background',
        })}
      >
        <EuiButtonGroup
          isDisabled={isEmptyIcon}
          isFullWidth={true}
          legend="icon background color"
          options={backgroundOptions}
          idSelected={state.iconBackground ?? 'shadow'}
          onChange={(value) => {
            setState({ ...state, iconBackground: value as MetricState['iconBackground'] });
          }}
          buttonSize="compressed"
        />
      </EuiFormRow>
    </>
  );
};
