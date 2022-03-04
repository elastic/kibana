/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { ConditionEntryField } from '@kbn/securitysolution-utils';
import { BaseDataGenerator } from './base_data_generator';
import { EffectScope, NewTrustedApp, TrustedApp } from '../types';

const TRUSTED_APP_NAMES = [
  'Symantec Endpoint Security',
  'Bitdefender GravityZone',
  'Malwarebytes',
  'Sophos Intercept X',
  'Webroot Business Endpoint Protection',
  'ESET Endpoint Security',
  'FortiClient',
  'Kaspersky Endpoint Security',
  'Trend Micro Apex One',
  'CylancePROTECT',
  'VIPRE',
  'Norton',
  'McAfee Endpoint Security',
  'AVG AntiVirus',
  'CrowdStrike Falcon',
  'Avast Business Antivirus',
  'Avira Antivirus',
  'Cisco AMP for Endpoints',
  'Eset Endpoint Antivirus',
  'VMware Carbon Black',
  'Palo Alto Networks Traps',
  'Trend Micro',
  'SentinelOne',
  'Panda Security for Desktops',
  'Microsoft Defender ATP',
];

const EFFECT_SCOPE_TYPES = ['policy', 'global'];

export class TrustedAppGenerator extends BaseDataGenerator<TrustedApp> {
  generate(overrides: DeepPartial<TrustedApp> = {}): TrustedApp {
    return merge(
      this.generateTrustedAppForCreate(),
      {
        id: this.seededUUIDv4(),
        version: this.randomString(5),
        created_at: this.randomPastDate(),
        updated_at: new Date().toISOString(),
        created_by: this.randomUser(),
        updated_by: this.randomUser(),
      },
      overrides
    );
  }

  generateTrustedAppForCreate({
    effectScope: effectiveScopeOverride,
    ...overrides
  }: DeepPartial<NewTrustedApp> = {}): NewTrustedApp {
    const name = this.randomChoice(TRUSTED_APP_NAMES);
    const scopeType = this.randomChoice(EFFECT_SCOPE_TYPES);
    const effectScope = (effectiveScopeOverride ?? {
      type: scopeType,
      ...(scopeType === 'policy' ? { policies: this.randomArray(5, () => this.randomUUID()) } : {}),
    }) as EffectScope;

    const os = overrides.os ?? 'windows';
    const pathEntry = this.randomChoice([
      {
        field: ConditionEntryField.PATH,
        operator: 'included',
        type: 'match',
        value: os !== 'windows' ? '/one/two/three' : 'c:\\fol\\bin.exe',
      },
      {
        field: ConditionEntryField.PATH,
        operator: 'included',
        type: 'wildcard',
        value: os !== 'windows' ? '/one/t*/*re/three.app' : 'c:\\fol*\\*ub*\\bin.exe',
      },
    ]);

    // TS types are conditional when it comes to the combination of OS and ENTRIES
    // @ts-expect-error TS2322
    return merge(
      {
        description: `Generator says we trust ${name}`,
        name,
        os,
        effectScope,
        entries: [
          {
            field: ConditionEntryField.HASH,
            operator: 'included',
            type: 'match',
            value: '1234234659af249ddf3e40864e9fb241',
          },
          pathEntry,
        ],
      },
      overrides
    );
  }
}
