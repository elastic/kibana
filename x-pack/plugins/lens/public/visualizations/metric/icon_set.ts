/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AvailableMetricIcon } from '@kbn/expression-metric-vis-plugin/common';
import { type IconSet } from '@kbn/visualization-ui-components';

export const iconsSet: IconSet<AvailableMetricIcon> = [
  {
    value: 'empty',
    label: i18n.translate('xpack.lens.metric.iconSelect.noIconLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'sortUp',
    label: i18n.translate('xpack.lens.metric.iconSelect.sortUpLabel', {
      defaultMessage: 'Sort up',
    }),
  },
  {
    value: 'sortDown',
    label: i18n.translate('xpack.lens.metric.iconSelect.sortDownLabel', {
      defaultMessage: 'Sort down',
    }),
  },
  {
    value: 'compute',
    label: i18n.translate('xpack.lens.metric.iconSelect.computeLabel', {
      defaultMessage: 'Compute',
    }),
  },
  {
    value: 'globe',
    label: i18n.translate('xpack.lens.metric.iconSelect.globeLabel', {
      defaultMessage: 'Globe',
    }),
  },
  {
    value: 'temperature',
    label: i18n.translate('xpack.lens.metric.iconSelect.temperatureLabel', {
      defaultMessage: 'Temperature',
    }),
  },
  {
    value: 'asterisk',
    label: i18n.translate('xpack.lens.metric.iconSelect.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('xpack.lens.metric.iconSelect.alertIconLabel', {
      defaultMessage: 'Alert',
    }),
  },
  {
    value: 'bell',
    label: i18n.translate('xpack.lens.metric.iconSelect.bellIconLabel', {
      defaultMessage: 'Bell',
    }),
  },
  {
    value: 'bolt',
    label: i18n.translate('xpack.lens.metric.iconSelect.boltIconLabel', {
      defaultMessage: 'Bolt',
    }),
  },
  {
    value: 'bug',
    label: i18n.translate('xpack.lens.metric.iconSelect.bugIconLabel', {
      defaultMessage: 'Bug',
    }),
  },

  {
    value: 'editorComment',
    label: i18n.translate('xpack.lens.metric.iconSelect.commentIconLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: 'flag',
    label: i18n.translate('xpack.lens.metric.iconSelect.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: 'heart',
    label: i18n.translate('xpack.lens.metric.iconSelect.heartLabel', { defaultMessage: 'Heart' }),
  },
  {
    value: 'mapMarker',
    label: i18n.translate('xpack.lens.metric.iconSelect.mapMarkerLabel', {
      defaultMessage: 'Map Marker',
    }),
  },
  {
    value: 'pin',
    label: i18n.translate('xpack.lens.metric.iconSelect.mapPinLabel', {
      defaultMessage: 'Map Pin',
    }),
  },
  {
    value: 'starEmpty',
    label: i18n.translate('xpack.lens.metric.iconSelect.starLabel', { defaultMessage: 'Star' }),
  },
  {
    value: 'tag',
    label: i18n.translate('xpack.lens.metric.iconSelect.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
];
