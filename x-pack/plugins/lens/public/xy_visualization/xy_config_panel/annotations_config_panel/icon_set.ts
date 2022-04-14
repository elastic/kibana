/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AvailableAnnotationIcon } from '../../../../../../../src/plugins/event_annotation/common';
import { IconTriangle, IconCircle } from '../../../assets/annotation_icons';
import { IconSet } from '../shared/icon_select';

export const annotationsIconSet: IconSet<AvailableAnnotationIcon> = [
  {
    value: 'asterisk',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.alertIconLabel', {
      defaultMessage: 'Alert',
    }),
  },
  {
    value: 'bell',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.bellIconLabel', {
      defaultMessage: 'Bell',
    }),
  },
  {
    value: 'bolt',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.boltIconLabel', {
      defaultMessage: 'Bolt',
    }),
  },
  {
    value: 'bug',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.bugIconLabel', {
      defaultMessage: 'Bug',
    }),
  },
  {
    value: 'circle',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.circleIconLabel', {
      defaultMessage: 'Circle',
    }),
    icon: IconCircle,
    canFill: true,
  },

  {
    value: 'editorComment',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.commentIconLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: 'flag',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: 'heart',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.heartLabel', { defaultMessage: 'Heart' }),
  },
  {
    value: 'mapMarker',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.mapMarkerLabel', {
      defaultMessage: 'Map Marker',
    }),
  },
  {
    value: 'pinFilled',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.mapPinLabel', {
      defaultMessage: 'Map Pin',
    }),
  },
  {
    value: 'starEmpty',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.starLabel', { defaultMessage: 'Star' }),
  },
  {
    value: 'tag',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
  {
    value: 'triangle',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.triangleIconLabel', {
      defaultMessage: 'Triangle',
    }),
    icon: IconTriangle,
    shouldRotate: true,
    canFill: true,
  },
];
