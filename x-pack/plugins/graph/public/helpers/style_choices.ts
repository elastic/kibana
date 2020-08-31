/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';

export interface FontawesomeIcon {
  class: string;
  code: string;
  patterns?: RegExp[];
  label: string;
}

export const iconChoices = [
  // Patterns are used to help default icon choices for common field names
  {
    class: 'fa-folder-open-o',
    code: '\uf115',
    patterns: [/category/i, /folder/i, /group/i],
    label: i18n.translate('xpack.graph.icon.folderOpen', { defaultMessage: 'Folder open' }),
  },
  {
    class: 'fa-cube',
    code: '\uf1b2',
    patterns: [/prod/i, /sku/i],
    label: i18n.translate('xpack.graph.icon.cube', { defaultMessage: 'Cube' }),
  },
  {
    class: 'fa-key',
    code: '\uf084',
    patterns: [/key/i],
    label: i18n.translate('xpack.graph.icon.key', { defaultMessage: 'Key' }),
  },
  {
    class: 'fa-bank',
    code: '\uf19c',
    patterns: [/bank/i, /account/i],
    label: i18n.translate('xpack.graph.icon.bank', { defaultMessage: 'Bank' }),
  },
  {
    class: 'fa-automobile',
    code: '\uf1b9',
    patterns: [/car/i, /veh/i],
    label: i18n.translate('xpack.graph.icon.automobile', { defaultMessage: 'Automobile' }),
  },
  {
    class: 'fa-home',
    code: '\uf015',
    patterns: [/address/i, /home/i],
    label: i18n.translate('xpack.graph.icon.home', { defaultMessage: 'Home' }),
  },
  {
    class: 'fa-question',
    code: '\uf128',
    patterns: [/query/i, /search/i],
    label: i18n.translate('xpack.graph.icon.question', { defaultMessage: 'Question' }),
  },
  {
    class: 'fa-plane',
    code: '\uf072',
    patterns: [/flight/i, /plane/i],
    label: i18n.translate('xpack.graph.icon.plane', { defaultMessage: 'Plane' }),
  },
  {
    class: 'fa-file-o',
    code: '\uf016',
    patterns: [/file/i, /doc/i],
    label: i18n.translate('xpack.graph.icon.file', { defaultMessage: 'File open' }),
  },
  {
    class: 'fa-user',
    code: '\uf007',
    patterns: [
      /user/i,
      /person/i,
      /people/i,
      /owner/i,
      /cust/i,
      /participant/i,
      /party/i,
      /member/i,
    ],
    label: i18n.translate('xpack.graph.icon.user', { defaultMessage: 'User' }),
  },
  {
    class: 'fa-users',
    code: '\uf0c0',
    patterns: [/group/i, /team/i, /meeting/i],
    label: i18n.translate('xpack.graph.icon.users', { defaultMessage: 'Users' }),
  },
  {
    class: 'fa-music',
    code: '\uf001',
    patterns: [/artist/i, /sound/i, /music/i],
    label: i18n.translate('xpack.graph.icon.music', { defaultMessage: 'Music' }),
  },
  {
    class: 'fa-flag',
    code: '\uf024',
    patterns: [/country/i, /warn/i, /flag/i],
    label: i18n.translate('xpack.graph.icon.flag', { defaultMessage: 'Flag' }),
  },
  {
    class: 'fa-tag',
    code: '\uf02b',
    patterns: [/tag/i, /label/i],
    label: 'Tag',
  },
  {
    class: 'fa-phone',
    code: '\uf095',
    patterns: [/phone/i],
    label: i18n.translate('xpack.graph.icon.phone', { defaultMessage: 'Phone' }),
  },
  {
    class: 'fa-desktop',
    code: '\uf108',
    patterns: [/host/i, /server/i],
    label: i18n.translate('xpack.graph.icon.desktop', { defaultMessage: 'Desktop' }),
  },
  {
    class: 'fa-font',
    code: '\uf031',
    patterns: [/text/i, /title/i, /body/i, /desc/i],
    label: i18n.translate('xpack.graph.icon.font', { defaultMessage: 'Font' }),
  },
  {
    class: 'fa-at',
    code: '\uf1fa',
    patterns: [/account/i, /email/i],
    label: i18n.translate('xpack.graph.icon.at', { defaultMessage: 'At' }),
  },
  {
    class: 'fa-heart',
    code: '\uf004',
    patterns: [/like/i, /favourite/i, /favorite/i],
    label: i18n.translate('xpack.graph.icon.heart', { defaultMessage: 'Heart' }),
  },
  {
    class: 'fa-bolt',
    code: '\uf0e7',
    patterns: [/action/i],
    label: i18n.translate('xpack.graph.icon.bolt', { defaultMessage: 'Bolt' }),
  },
  {
    class: 'fa-map-marker',
    code: '\uf041',
    patterns: [/location/i, /geo/i, /position/i],
    label: i18n.translate('xpack.graph.icon.mapMarker', { defaultMessage: 'Map marker' }),
  },
  {
    class: 'fa-exclamation',
    code: '\uf12a',
    patterns: [/risk/i, /error/i, /warn/i],
    label: i18n.translate('xpack.graph.icon.exclamation', { defaultMessage: 'Exclamation' }),
  },
  {
    class: 'fa-industry',
    code: '\uf275',
    patterns: [/business/i, /company/i, /industry/i, /organisation/i],
    label: i18n.translate('xpack.graph.icon.industry', { defaultMessage: 'Industry' }),
  },
];

export const getSuitableIcon = (fieldName: string) =>
  iconChoices.find((choice) => choice.patterns.some((pattern) => pattern.test(fieldName))) ||
  iconChoices[0];

export const iconChoicesByClass: Partial<Record<string, FontawesomeIcon>> = {};

iconChoices.forEach((icon) => {
  iconChoicesByClass[icon.class] = icon;
});

export const urlTemplateIconChoices = [
  // Patterns are used to help default icon choices for common field names
  {
    class: 'fa-line-chart',
    code: '\uf201',
    label: i18n.translate('xpack.graph.icon.lineChart', { defaultMessage: 'Line chart' }),
  },
  {
    class: 'fa-pie-chart',
    code: '\uf200',
    label: i18n.translate('xpack.graph.icon.pieChart', { defaultMessage: 'Pie chart' }),
  },
  {
    class: 'fa-area-chart',
    code: '\uf1fe',
    label: i18n.translate('xpack.graph.icon.areaChart', { defaultMessage: 'Area chart' }),
  },
  {
    class: 'fa-bar-chart',
    code: '\uf080',
    label: i18n.translate('xpack.graph.icon.barChart', { defaultMessage: 'Bar chart' }),
  },
  {
    class: 'fa-globe',
    code: '\uf0ac',
    label: i18n.translate('xpack.graph.icon.globe', { defaultMessage: 'Globe' }),
  },
  {
    class: 'fa-file-text-o',
    code: '\uf0f6',
    label: i18n.translate('xpack.graph.icon.fileText', { defaultMessage: 'File' }),
  },
  {
    class: 'fa-google',
    code: '\uf1a0',
    label: i18n.translate('xpack.graph.icon.google', { defaultMessage: 'Google' }),
  },
  {
    class: 'fa-eye',
    code: '\uf06e',
    label: i18n.translate('xpack.graph.icon.eye', { defaultMessage: 'Eye' }),
  },
  {
    class: 'fa-tachometer',
    code: '\uf0e4',
    label: i18n.translate('xpack.graph.icon.tachometer', { defaultMessage: 'Tachometer' }),
  },
  {
    class: 'fa-info',
    code: '\uf129',
    label: i18n.translate('xpack.graph.icon.info', { defaultMessage: 'Info' }),
  },
  {
    class: 'fa-external-link',
    code: '\uf08e',
    label: i18n.translate('xpack.graph.icon.externalLink', { defaultMessage: 'External link' }),
  },
  {
    class: 'fa-table',
    code: '\uf0ce',
    label: i18n.translate('xpack.graph.icon.table', { defaultMessage: 'Table' }),
  },
  {
    class: 'fa-list',
    code: '\uf03a',
    label: i18n.translate('xpack.graph.icon.list', { defaultMessage: 'List' }),
  },
  {
    class: 'fa-share-alt',
    code: '\uf1e0',
    label: i18n.translate('xpack.graph.icon.shareAlt', { defaultMessage: 'Share alt' }),
  },
];
export const urlTemplateIconChoicesByClass: Partial<Record<string, FontawesomeIcon>> = {};

urlTemplateIconChoices.forEach((icon) => {
  urlTemplateIconChoicesByClass[icon.class] = icon;
});

export const colorChoices = euiPaletteColorBlind();
