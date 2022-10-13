/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExistingEnvironmentsForService } from './get_environments/get_existing_environments_for_service';
import { listConfigurations } from './list_configurations';
import { searchConfigurations } from './search_configurations';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../../utils/test_helpers';
import { findExactConfiguration } from './find_exact_configuration';
import { getAllEnvironments } from '../../environments/get_all_environments';

describe('agent configuration queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  describe('getAllEnvironments', () => {
    it('fetches all environments', async () => {
      mock = await inspectSearchParams((setup) =>
        getAllEnvironments({
          searchAggregatedTransactions: false,
          serviceName: 'foo',
          setup,
          size: 50,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });
  });

  describe('getExistingEnvironmentsForService', () => {
    it('fetches unavailable environments', async () => {
      mock = await inspectSearchParams((setup) =>
        getExistingEnvironmentsForService({
          serviceName: 'foo',
          setup,
          size: 50,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });
  });

  describe('listConfigurations', () => {
    it('fetches configurations', async () => {
      mock = await inspectSearchParams((setup) =>
        listConfigurations({
          setup,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });
  });

  describe('searchConfigurations', () => {
    it('fetches filtered configurations without an environment', async () => {
      mock = await inspectSearchParams((setup) =>
        searchConfigurations({
          service: {
            name: 'foo',
          },
          setup,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });

    it('fetches filtered configurations with an environment', async () => {
      mock = await inspectSearchParams((setup) =>
        searchConfigurations({
          service: {
            name: 'foo',
            environment: 'bar',
          },
          setup,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });
  });

  describe('findExactConfiguration', () => {
    it('find configuration by service.name', async () => {
      mock = await inspectSearchParams((setup) =>
        findExactConfiguration({
          service: { name: 'foo' },
          setup,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });

    it('find configuration by service.environment', async () => {
      mock = await inspectSearchParams((setup) =>
        findExactConfiguration({
          service: { environment: 'bar' },
          setup,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });

    it('find configuration by service.name and service.environment', async () => {
      mock = await inspectSearchParams((setup) =>
        findExactConfiguration({
          service: { name: 'foo', environment: 'bar' },
          setup,
        })
      );

      expect(mock.params).toMatchSnapshot();
    });
  });
});
