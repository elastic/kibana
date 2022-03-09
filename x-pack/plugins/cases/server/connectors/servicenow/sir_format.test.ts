/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse } from '../../../common/api';
import { format } from './sir_format';

describe('SIR formatter', () => {
  const theCase = {
    id: 'case-id',
    connector: {
      fields: {
        destIp: true,
        sourceIp: true,
        category: 'Denial of Service',
        subcategory: 'Inbound DDos',
        malwareHash: true,
        malwareUrl: true,
        priority: '2 - High',
      },
    },
  } as CaseResponse;

  it('it formats correctly without alerts', async () => {
    const res = await format(theCase, []);
    expect(res).toEqual({
      dest_ip: [],
      source_ip: [],
      category: 'Denial of Service',
      subcategory: 'Inbound DDos',
      malware_hash: [],
      malware_url: [],
      priority: '2 - High',
      correlation_display: 'Elastic Case',
      correlation_id: 'case-id',
    });
  });

  it('it formats correctly when fields do not exist ', async () => {
    const invalidFields = { connector: { fields: null } } as CaseResponse;
    const res = await format(invalidFields, []);
    expect(res).toEqual({
      dest_ip: [],
      source_ip: [],
      category: null,
      subcategory: null,
      malware_hash: [],
      malware_url: [],
      priority: null,
      correlation_display: 'Elastic Case',
      correlation_id: null,
    });
  });

  it('it formats correctly with alerts', async () => {
    const alerts = [
      {
        id: 'alert-1',
        index: 'index-1',
        destination: { ip: '192.168.1.1' },
        source: { ip: '192.168.1.2' },
        file: {
          hash: { sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' },
        },
        url: { full: 'https://attack.com' },
      },
      {
        id: 'alert-2',
        index: 'index-2',
        destination: { ip: '192.168.1.4' },
        source: { ip: '192.168.1.3' },
        file: {
          hash: { sha256: '60303ae22b998861bce3b28f33eec1be758a213c86c93c076dbe9f558c11c752' },
        },
        url: { full: 'https://attack.com/api' },
      },
    ];
    const res = await format(theCase, alerts);
    expect(res).toEqual({
      dest_ip: ['192.168.1.1', '192.168.1.4'],
      source_ip: ['192.168.1.2', '192.168.1.3'],
      category: 'Denial of Service',
      subcategory: 'Inbound DDos',
      malware_hash: [
        '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        '60303ae22b998861bce3b28f33eec1be758a213c86c93c076dbe9f558c11c752',
      ],
      malware_url: ['https://attack.com', 'https://attack.com/api'],
      priority: '2 - High',
      correlation_display: 'Elastic Case',
      correlation_id: 'case-id',
    });
  });

  it('it handles duplicates correctly', async () => {
    const alerts = [
      {
        id: 'alert-1',
        index: 'index-1',
        destination: { ip: '192.168.1.1' },
        source: { ip: '192.168.1.2' },
        file: {
          hash: { sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' },
        },
        url: { full: 'https://attack.com' },
      },
      {
        id: 'alert-2',
        index: 'index-2',
        destination: { ip: '192.168.1.1' },
        source: { ip: '192.168.1.3' },
        file: {
          hash: { sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' },
        },
        url: { full: 'https://attack.com/api' },
      },
    ];
    const res = await format(theCase, alerts);
    expect(res).toEqual({
      dest_ip: ['192.168.1.1'],
      source_ip: ['192.168.1.2', '192.168.1.3'],
      category: 'Denial of Service',
      subcategory: 'Inbound DDos',
      malware_hash: ['9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'],
      malware_url: ['https://attack.com', 'https://attack.com/api'],
      priority: '2 - High',
      correlation_display: 'Elastic Case',
      correlation_id: 'case-id',
    });
  });

  it('it formats correctly when field is not selected', async () => {
    const alerts = [
      {
        id: 'alert-1',
        index: 'index-1',
        destination: { ip: '192.168.1.1' },
        source: { ip: '192.168.1.2' },
        file: {
          hash: { sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' },
        },
        url: { full: 'https://attack.com' },
      },
      {
        id: 'alert-2',
        index: 'index-2',
        destination: { ip: '192.168.1.1' },
        source: { ip: '192.168.1.3' },
        file: {
          hash: { sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' },
        },
        url: { full: 'https://attack.com/api' },
      },
    ];

    const newCase = {
      ...theCase,
      connector: { fields: { ...theCase.connector.fields, destIp: false, malwareHash: false } },
    } as CaseResponse;

    const res = await format(newCase, alerts);
    expect(res).toEqual({
      dest_ip: [],
      source_ip: ['192.168.1.2', '192.168.1.3'],
      category: 'Denial of Service',
      subcategory: 'Inbound DDos',
      malware_hash: [],
      malware_url: ['https://attack.com', 'https://attack.com/api'],
      priority: '2 - High',
      correlation_display: 'Elastic Case',
      correlation_id: 'case-id',
    });
  });
});
