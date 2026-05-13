/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';
import { buildFiltersFromAlert, buildKueryFromAlert } from './build_alert_filters';

type AlertFields = AlertDetailsAppSectionProps['alert']['fields'];

function makeAlert(
  fields: Partial<Record<keyof AlertFields, string | undefined>>
): AlertDetailsAppSectionProps['alert'] {
  return { fields } as unknown as AlertDetailsAppSectionProps['alert'];
}

describe('buildKueryFromAlert', () => {
  it('omits fields that are missing or empty', () => {
    expect(buildKueryFromAlert(makeAlert({}))).toBe('');
    expect(
      buildKueryFromAlert(
        makeAlert({
          [SERVICE_NAME]: '   ',
          [TRANSACTION_TYPE]: '',
          [TRANSACTION_NAME]: undefined,
        })
      )
    ).toBe('');
  });

  it('joins multiple parts with " and "', () => {
    expect(
      buildKueryFromAlert(
        makeAlert({
          [SERVICE_NAME]: 'opbeans-node',
          [TRANSACTION_TYPE]: 'request',
          [TRANSACTION_NAME]: 'GET /api/users',
        })
      )
    ).toBe(
      'service.name: "opbeans-node" and transaction.type: "request" and transaction.name: "GET /api/users"'
    );
  });

  it('escapes double-quotes inside values', () => {
    expect(buildKueryFromAlert(makeAlert({ [SERVICE_NAME]: 'weird"service' }))).toBe(
      'service.name: "weird\\"service"'
    );
  });

  it('escapes backslashes inside values (CodeQL fix: backslash-before-quote)', () => {
    expect(buildKueryFromAlert(makeAlert({ [SERVICE_NAME]: 'back\\slash' }))).toBe(
      'service.name: "back\\\\slash"'
    );
    expect(buildKueryFromAlert(makeAlert({ [SERVICE_NAME]: 'back\\"slash' }))).toBe(
      'service.name: "back\\\\\\"slash"'
    );
  });

  it('coerces non-string fields without throwing', () => {
    expect(buildKueryFromAlert(makeAlert({ [SERVICE_NAME]: 123 as unknown as string }))).toBe(
      'service.name: "123"'
    );
  });

  it('does not include service.environment in the kuery', () => {
    expect(
      buildKueryFromAlert(
        makeAlert({
          [SERVICE_NAME]: 'opbeans-node',
          [SERVICE_ENVIRONMENT]: 'production',
        })
      )
    ).toBe('service.name: "opbeans-node"');
  });
});

describe('buildFiltersFromAlert', () => {
  it('produces a chip per populated field in stable order', () => {
    expect(
      buildFiltersFromAlert(
        makeAlert({
          [SERVICE_NAME]: 'opbeans-node',
          [SERVICE_ENVIRONMENT]: 'production',
          [TRANSACTION_TYPE]: 'request',
          [TRANSACTION_NAME]: 'GET /api/users',
        })
      )
    ).toEqual([
      { label: 'service.name: opbeans-node', field: 'service.name' },
      { label: 'service.environment: production', field: 'service.environment' },
      { label: 'transaction.type: request', field: 'transaction.type' },
      { label: 'transaction.name: GET /api/users', field: 'transaction.name' },
    ]);
  });

  it('skips empty/whitespace-only fields', () => {
    expect(
      buildFiltersFromAlert(
        makeAlert({
          [SERVICE_NAME]: 'opbeans-node',
          [SERVICE_ENVIRONMENT]: '   ',
          [TRANSACTION_TYPE]: '',
        })
      )
    ).toEqual([{ label: 'service.name: opbeans-node', field: 'service.name' }]);
  });

  it('renders raw (unescaped) values — chips are display only, not query', () => {
    expect(
      buildFiltersFromAlert(makeAlert({ [SERVICE_NAME]: 'weird"service\\with-slash' }))
    ).toEqual([
      {
        label: 'service.name: weird"service\\with-slash',
        field: 'service.name',
      },
    ]);
  });
});
