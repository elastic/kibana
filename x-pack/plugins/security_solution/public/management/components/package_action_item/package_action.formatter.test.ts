/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetServerAgentComponentUnit } from '@kbn/fleet-plugin/common/types';

import { PackageActionFormatter, titles, descriptions } from './package_action_formatter';
import { ENDPOINT_ERROR_CODES } from '../../../../common/endpoint/constants';

describe('PackageActionFormatter', () => {
  it('correctly formats es connection error', () => {
    const unit: FleetServerAgentComponentUnit = {
      id: 'test-id',
      type: 'input',
      status: 'failed',
      message: 'test message',
      payload: {
        error: {
          code: ENDPOINT_ERROR_CODES.ES_CONNECTION_ERROR,
          message: 'an error message',
        },
      },
    };
    const docLinks = { es_connection: 'somedoclink' };
    const formatter = new PackageActionFormatter(unit, docLinks);
    expect(formatter.key).toBe('es_connection');
    expect(formatter.title).toBe(titles.get('es_connection'));
    expect(formatter.description).toBe(descriptions.get('es_connection'));
    expect(formatter.linkUrl).toBe(docLinks.es_connection);
  });

  it('correct formats generic error', () => {
    const unit: FleetServerAgentComponentUnit = {
      id: 'test-id',
      type: 'input',
      status: 'failed',
      message: 'test message',
    };
    const docLinks = { es_connection: 'somedoclink' };
    const formatter = new PackageActionFormatter(unit, docLinks);
    expect(formatter.key).toBe('policy_failure');
    expect(formatter.title).toBe(titles.get('policy_failure'));
    expect(formatter.description).toBe(descriptions.get('policy_failure'));
  });
});
