/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { ManageProcessorsTestBed } from './helpers/manage_processors.helpers';

import { setupEnvironment, pageHelpers } from './helpers';
import type { GeoipDatabase } from '../../common/types';
import { API_BASE_PATH } from '../../common/constants';

const { setup } = pageHelpers.manageProcessors;

describe('<ManageProcessors />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: ManageProcessorsTestBed;

  describe('With databases', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    const database1: GeoipDatabase = {
      name: 'GeoIP2-Anonymous-IP',
      id: 'geoip2-anonymous-ip',
      type: 'maxmind',
    };

    const database2: GeoipDatabase = {
      name: 'GeoIP2-City',
      id: 'geoip2-city',
      type: 'maxmind',
    };

    const database3: GeoipDatabase = {
      name: 'GeoIP2-Country',
      id: 'geoip2-country',
      type: 'maxmind',
    };

    const database4: GeoipDatabase = {
      name: 'Free-IP-to-ASN',
      id: 'free-ip-to-asn',
      type: 'ipinfo',
    };

    const databases = [database1, database2, database3, database4];

    httpRequestsMockHelpers.setLoadDatabasesResponse(databases);

    test('renders the list of databases', async () => {
      const { exists, find, table } = testBed;

      // Page title
      expect(exists('manageProcessorsTitle')).toBe(true);
      expect(find('manageProcessorsTitle').text()).toEqual('Manage Processors');

      // Add database button
      expect(exists('addGeoipDatabaseButton')).toBe(true);

      // Table has columns for database name and type
      const { tableCellsValues } = table.getMetaData('geoipDatabaseList');
      tableCellsValues.forEach((row, i) => {
        const database = databases[i];

        expect(row).toEqual([
          database.name,
          database.type === 'maxmind' ? 'MaxMind' : 'IPInfo',
          '',
        ]);
      });
    });

    test('deletes a database', async () => {
      const { actions } = testBed;
      const databaseIndexToDelete = 0;
      const databaseName = databases[databaseIndexToDelete].name;
      httpRequestsMockHelpers.setDeleteDatabasesResponse(databaseName, {});

      await actions.clickDeleteDatabaseButton(databaseIndexToDelete);

      await actions.confirmDeletingDatabase();

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/databases/${databaseName.toLowerCase()}`,
        expect.anything()
      );
    });
  });

  describe('Creates a database', () => {
    it('creates a MaxMind database when none with the same name exists', async () => {
      const { actions, exists } = testBed;
      const databaseName = 'GeoIP2-ISP';
      const maxmind = '123456';
      httpRequestsMockHelpers.setCreateDatabasesResponse({
        name: databaseName,
        id: databaseName.toLowerCase(),
      });

      await actions.clickAddDatabaseButton();

      expect(exists('addGeoipDatabaseForm')).toBe(true);

      await actions.fillOutDatabaseValues('maxmind', databaseName, maxmind);

      await actions.confirmAddingDatabase();

      expect(httpSetup.post).toHaveBeenLastCalledWith(`${API_BASE_PATH}/databases`, {
        asSystemRequest: undefined,
        body: '{"databaseType":"maxmind","databaseName":"GeoIP2-ISP","maxmind":"123456"}',
        query: undefined,
        version: undefined,
      });
    });

    it('creates an IPInfo database when none with the same name exists', async () => {
      const { actions, exists } = testBed;
      const databaseName = 'ASN';
      httpRequestsMockHelpers.setCreateDatabasesResponse({
        name: databaseName,
        id: databaseName.toLowerCase(),
      });

      await actions.clickAddDatabaseButton();

      expect(exists('addGeoipDatabaseForm')).toBe(true);

      await actions.fillOutDatabaseValues('ipinfo', databaseName);

      await actions.confirmAddingDatabase();

      expect(httpSetup.post).toHaveBeenLastCalledWith(`${API_BASE_PATH}/databases`, {
        asSystemRequest: undefined,
        body: '{"databaseType":"ipinfo","databaseName":"ASN","maxmind":""}',
        query: undefined,
        version: undefined,
      });
    });
  });

  describe('No databases', () => {
    test('displays an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadDatabasesResponse([]);

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { exists, component } = testBed;
      component.update();

      expect(exists('geoipEmptyListPrompt')).toBe(true);
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadDatabasesResponse(undefined, error);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('displays an error callout', async () => {
      const { exists } = testBed;

      expect(exists('geoipListLoadingError')).toBe(true);
    });
  });
});
