/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegration } from '../../../../../../src/plugins/custom_integrations/common';

export const integrations: CustomIntegration[] = [
  {
    id: 'b.ga_beats',
    categories: ['azure', 'cloud', 'config_management'],
    description: 'Beats for a GA package that is not installed',
    isBeta: false,
    shipper: 'beats',
    icons: [
      {
        type: 'eui',
        src: 'logoBeats',
      },
    ],
    title: 'b. GA, has Beats',
    type: 'ui_link',
    uiInternalPath: '/',
    eprOverlap: 'ga_beats',
  },
  {
    id: 'f.beta_beats',
    categories: ['azure', 'cloud', 'config_management'],
    description: 'Beats for a beta package that is not installed',
    isBeta: false,
    shipper: 'beats',
    icons: [
      {
        type: 'eui',
        src: 'logoBeats',
      },
    ],
    title: 'f. Beta, has Beats',
    type: 'ui_link',
    uiInternalPath: '/',
    eprOverlap: 'beta_beats',
  },
  {
    id: 'j.exp_beats',
    categories: ['azure', 'cloud', 'config_management'],
    description: 'Beats for an experimental package that is not installed',
    isBeta: false,
    shipper: 'beats',
    icons: [
      {
        type: 'eui',
        src: 'logoBeats',
      },
    ],
    title: 'j. Experimental, has Beats',
    type: 'ui_link',
    uiInternalPath: '/',
    eprOverlap: 'exp_beats',
  },
];
