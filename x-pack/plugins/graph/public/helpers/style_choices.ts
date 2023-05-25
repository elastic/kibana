/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';
import type { IconName } from '@fortawesome/fontawesome-common-types';
import '@fortawesome/free-solid-svg-icons';
import type { FontawesomeIcon4, NodeIconType } from '@kbn/graph-renderer';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
// eslint-disable-next-line import/no-extraneous-dependencies
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

library.add(fas);
library.add(faGoogle);

export const iconChoices: NodeIconType[] = [
  // Patterns are used to help default icon choices for common field names
  {
    version: 'fa5',
    name: 'folder-open',
    patterns: [/category/i, /folder/i, /group/i],
    label: i18n.translate('xpack.graph.icon.folderOpen', { defaultMessage: 'Folder open' }),
  },
  {
    name: 'cube',
    version: 'fa5',
    patterns: [/prod/i, /sku/i],
    label: i18n.translate('xpack.graph.icon.cube', { defaultMessage: 'Cube' }),
  },
  {
    name: 'key',

    version: 'fa5',
    patterns: [/key/i],
    label: i18n.translate('xpack.graph.icon.key', { defaultMessage: 'Key' }),
  },
  {
    name: 'university',
    version: 'fa5',
    patterns: [/bank/i, /account/i],
    label: i18n.translate('xpack.graph.icon.bank', { defaultMessage: 'Bank' }),
  },
  {
    name: 'car',
    version: 'fa5',
    patterns: [/car/i, /veh/i],
    label: i18n.translate('xpack.graph.icon.automobile', { defaultMessage: 'Automobile' }),
  },
  {
    name: 'home',
    version: 'fa5',
    patterns: [/address/i, /home/i],
    label: i18n.translate('xpack.graph.icon.home', { defaultMessage: 'Home' }),
  },
  {
    name: 'question',

    version: 'fa5',
    patterns: [/query/i, /search/i],
    label: i18n.translate('xpack.graph.icon.question', { defaultMessage: 'Question' }),
  },
  {
    name: 'plane',

    version: 'fa5',
    patterns: [/flight/i, /plane/i],
    label: i18n.translate('xpack.graph.icon.plane', { defaultMessage: 'Plane' }),
  },
  {
    name: 'file',
    version: 'fa5',
    patterns: [/file/i, /doc/i],
    label: i18n.translate('xpack.graph.icon.file', { defaultMessage: 'File open' }),
  },
  {
    name: 'user',

    version: 'eui',
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
    name: 'users',

    version: 'fa5',
    patterns: [/group/i, /team/i, /meeting/i],
    label: i18n.translate('xpack.graph.icon.users', { defaultMessage: 'Users' }),
  },
  {
    name: 'music',

    version: 'fa5',
    patterns: [/artist/i, /sound/i, /music/i],
    label: i18n.translate('xpack.graph.icon.music', { defaultMessage: 'Music' }),
  },
  {
    name: 'flag',

    version: 'fa5',
    patterns: [/country/i, /warn/i, /flag/i],
    label: i18n.translate('xpack.graph.icon.flag', { defaultMessage: 'Flag' }),
  },
  {
    name: 'tag',

    version: 'fa5',
    patterns: [/tag/i, /label/i],
    label: 'Tag',
  },
  {
    name: 'phone',

    version: 'fa5',
    patterns: [/phone/i],
    label: i18n.translate('xpack.graph.icon.phone', { defaultMessage: 'Phone' }),
  },
  {
    name: 'desktop',

    version: 'fa5',
    patterns: [/host/i, /server/i],
    label: i18n.translate('xpack.graph.icon.desktop', { defaultMessage: 'Desktop' }),
  },
  {
    name: 'font',

    version: 'fa5',
    patterns: [/text/i, /title/i, /body/i, /desc/i],
    label: i18n.translate('xpack.graph.icon.font', { defaultMessage: 'Font' }),
  },
  {
    name: 'at',

    version: 'fa5',
    patterns: [/account/i, /email/i],
    label: i18n.translate('xpack.graph.icon.at', { defaultMessage: 'At' }),
  },
  {
    name: 'heart',

    version: 'fa5',
    patterns: [/like/i, /favourite/i, /favorite/i],
    label: i18n.translate('xpack.graph.icon.heart', { defaultMessage: 'Heart' }),
  },
  {
    name: 'bolt',

    version: 'fa5',
    patterns: [/action/i],
    label: i18n.translate('xpack.graph.icon.bolt', { defaultMessage: 'Bolt' }),
  },
  {
    name: 'map-marker',

    version: 'fa5',
    patterns: [/location/i, /geo/i, /position/i],
    label: i18n.translate('xpack.graph.icon.mapMarker', { defaultMessage: 'Map marker' }),
  },
  {
    name: 'exclamation',
    version: 'fa5',
    patterns: [/risk/i, /error/i, /warn/i],
    label: i18n.translate('xpack.graph.icon.exclamation', { defaultMessage: 'Exclamation' }),
  },
  {
    name: 'industry',
    version: 'fa5',
    patterns: [/business/i, /company/i, /industry/i, /organisation/i],
    label: i18n.translate('xpack.graph.icon.industry', { defaultMessage: 'Industry' }),
  },
];

export const iconChoicesOld = [
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
  iconChoices.find((choice) => choice.patterns?.some((pattern) => pattern.test(fieldName))) ||
  iconChoices[0];

export const iconChoicesByClass: Partial<Record<string, NodeIconType>> = {};

iconChoices.forEach((icon) => {
  iconChoicesByClass[icon.name] = icon;
});

export const urlTemplateIconChoices: NodeIconType[] = [
  // Patterns are used to help default icon choices for common field names
  {
    name: 'chart-line',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.lineChart', { defaultMessage: 'Line chart' }),
  },
  {
    name: 'chart-pie',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.pieChart', { defaultMessage: 'Pie chart' }),
  },
  {
    name: 'chart-area',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.areaChart', { defaultMessage: 'Area chart' }),
  },
  {
    name: 'chart-bar',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.barChart', { defaultMessage: 'Bar chart' }),
  },
  {
    name: 'globe',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.globe', { defaultMessage: 'Globe' }),
  },
  {
    name: 'file-alt',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.fileText', { defaultMessage: 'File' }),
  },
  {
    name: 'google',
    prefix: 'fab',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.google', { defaultMessage: 'Google' }),
  },
  {
    name: 'eye',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.eye', { defaultMessage: 'Eye' }),
  },
  {
    name: 'tachometer',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.tachometer', { defaultMessage: 'Tachometer' }),
  },
  {
    name: 'info',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.info', { defaultMessage: 'Info' }),
  },
  {
    name: 'external-link',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.externalLink', { defaultMessage: 'External link' }),
  },
  {
    name: 'table',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.table', { defaultMessage: 'Table' }),
  },
  {
    name: 'list',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.list', { defaultMessage: 'List' }),
  },
  {
    name: 'share-alt',
    version: 'fa5',
    label: i18n.translate('xpack.graph.icon.shareAlt', { defaultMessage: 'Share alt' }),
  },
];
export const urlTemplateIconChoicesByClass: Partial<Record<string, NodeIconType>> = {};

urlTemplateIconChoices.forEach((icon) => {
  urlTemplateIconChoicesByClass[icon.name] = icon;
});

export const colorChoices = euiPaletteColorBlind();

export function isNewIcon(icon: FontawesomeIcon4 | NodeIconType | string): icon is NodeIconType {
  return (
    icon != null &&
    (typeof icon !== 'string' ? 'version' in icon : iconChoices.some(({ name }) => name === icon))
  );
}

function ensureNewNames(iconName: string): IconName {
  if (iconName === 'file-text-o') {
    return 'file-alt';
  }
  if (iconName === 'bank') {
    return 'university';
  }
  if (iconName === 'automobile') {
    return 'car';
  }
  // line-chart => chart-line
  // pie-chart => chart-pie
  // etc...
  if (/chart$/.test(iconName)) {
    return iconName.split('-').reverse().join('-') as IconName;
  }
  return iconName as IconName;
}

function getNewIcon(iconName: FontawesomeIcon4['class']): IconName {
  const newIconName = ensureNewNames(iconName.replace('fa-', ''));
  return newIconName;
}

export function convertToNewIcon(icon: FontawesomeIcon4 | string): NodeIconType {
  const iconName = getNewIcon(typeof icon === 'string' ? icon : icon.class);
  return (iconChoicesByClass[iconName] || urlTemplateIconChoicesByClass[iconName])!;
}
