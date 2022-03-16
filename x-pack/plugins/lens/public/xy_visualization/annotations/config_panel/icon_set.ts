/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  IconSquare,
  IconTriangle,
  IconHexagon,
  IconCircle,
} from '../../../assets/annotation_icons';
import { euiIconsSet } from '../../xy_config_panel/shared/icon_select';

export const annotationsIconSet = [
  {
    value: 'triangle',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.triangleIconLabel', {
      defaultMessage: 'Triangle',
    }),
    icon: IconTriangle,
  },
  {
    value: 'square',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.squareIconLabel', {
      defaultMessage: 'Square',
    }),
    icon: IconSquare,
  },
  {
    value: 'circle',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.circleIconLabel', {
      defaultMessage: 'Circle',
    }),
    icon: IconCircle,
  },
  {
    value: 'hexagon',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.hexagonIconLabel', {
      defaultMessage: 'Hexagon',
    }),
    icon: IconHexagon,
  },
  ...euiIconsSet,
];
