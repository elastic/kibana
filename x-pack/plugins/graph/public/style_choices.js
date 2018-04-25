/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const iconChoices = [
  //Patterns are used to help default icon choices for common field names
  {
    class: 'fa-folder-open-o',
    code: '\uf115',
    'patterns': [/category/i, /folder/i, /group/i]
  }, {
    class: 'fa-cube',
    code: '\uf1b2',
    'patterns': [/prod/i, /sku/i]
  }, {
    class: 'fa-key',
    code: '\uf084',
    'patterns': [/key/i]
  }, {
    class: 'fa-bank',
    code: '\uf19c',
    'patterns': [/bank/i, /account/i]
  }, {
    class: 'fa-automobile',
    code: '\uf1b9',
    'patterns': [/car/i, /veh/i]
  }, {
    class: 'fa-home',
    code: '\uf015',
    'patterns': [/address/i, /home/i]
  }, {
    class: 'fa-question',
    code: '\uf128',
    'patterns': [/query/i, /search/i]
  }, {
    class: 'fa-plane',
    code: '\uf072',
    'patterns': [/flight/i, /plane/i]
  }, {
    class: 'fa-file-o',
    code: '\uf016',
    'patterns': [/file/i, /doc/i]
  }, {
    class: 'fa-user',
    code: '\uf007',
    'patterns': [/user/i, /person/i, /people/i, /owner/i, /cust/i, /participant/i, /party/i, /member/i]
  }, {
    class: 'fa-users',
    code: '\uf0c0',
    'patterns': [/group/i, /team/i, /meeting/i]
  }, {
    class: 'fa-music',
    code: '\uf001',
    'patterns': [/artist/i, /sound/i, /music/i]
  }, {
    class: 'fa-flag',
    code: '\uf024',
    'patterns': [/country/i, /warn/i, /flag/i]
  }, {
    class: 'fa-tag',
    code: '\uf02b',
    'patterns': [/tag/i, /label/i]
  }, {
    class: 'fa-phone',
    code: '\uf095',
    'patterns': [/phone/i]
  }, {
    class: 'fa-desktop',
    code: '\uf108',
    'patterns': [/host/i, /server/i]
  }, {
    class: 'fa-font',
    code: '\uf031',
    'patterns': [/text/i, /title/i, /body/i, /desc/i]
  }, {
    class: 'fa-at',
    code: '\uf1fa',
    'patterns': [/account/i, /email/i]
  }, {
    class: 'fa-heart',
    code: '\uf004',
    'patterns': [/like/i, /favourite/i, /favorite/i]
  }, {
    class: 'fa-bolt',
    code: '\uf0e7',
    'patterns': [/action/i]
  }, {
    class: 'fa-map-marker',
    code: '\uf041',
    'patterns': [/location/i, /geo/i, /position/i]
  }, {
    class: 'fa-exclamation',
    code: '\uf12a',
    'patterns': [/risk/i, /error/i, /warn/i]
  }, {
    class: 'fa-industry',
    code: '\uf275',
    'patterns': [/business/i, /company/i, /industry/i, /organisation/i]
  }
];

export const iconChoicesByClass = {};

iconChoices.forEach(icon => {
  iconChoicesByClass[icon.class] = icon;
});


export const drillDownIconChoices = [
  //Patterns are used to help default icon choices for common field names
  {
    class: 'fa-line-chart',
    code: '\uf201'
  }, {
    class: 'fa-pie-chart',
    code: '\uf200'
  }, {
    class: 'fa-area-chart',
    code: '\uf1fe'
  }, {
    class: 'fa-bar-chart',
    code: '\uf080'
  }, {
    class: 'fa-globe',
    code: '\uf0ac'
  }, {
    class: 'fa-file-text-o',
    code: '\uf0f6'
  }, {
    class: 'fa-google',
    code: '\uf1a0'
  }, {
    class: 'fa-eye',
    code: '\uf06e'
  }, {
    class: 'fa-tachometer',
    code: '\uf0e4'
  }, {
    class: 'fa-info',
    code: '\uf129'
  }, {
    class: 'fa-external-link',
    code: '\uf08e'
  }, {
    class: 'fa-table',
    code: '\uf0ce'
  }, {
    class: 'fa-list',
    code: '\uf03a'
  }, {
    class: 'fa-share-alt',
    code: '\uf1e0'
  }
];
export const drillDownIconChoicesByClass = {};

drillDownIconChoices.forEach(icon => {
  drillDownIconChoicesByClass[icon.class] = icon;
});





export const colorChoices = ['#99bde7', '#e3d754', '#8ee684', '#e7974c', '#e4878d', '#67adab',
  '#43ebcc', '#e4b4ea', '#a1a655', '#78b36e'];
