/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IndicatorsTable } from '.';

export default {
  component: IndicatorsTable,
  title: 'IndicatorsTable',
};

export function WithIndicators() {
  return (
    <IndicatorsTable
      indicators={[
        {
          value: '12.68.554.87',
          type: 'IP Address',
          feed: 'AbuseCH',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
        {
          value: 'https://www.abuse.ch/blocklist/',
          type: 'URL',
          feed: 'AlienVault OTX',
        },
      ]}
    />
  );
}
