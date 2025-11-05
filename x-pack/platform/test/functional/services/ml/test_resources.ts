/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { JobType } from '@kbn/ml-plugin/common/types/saved_objects';
import { API_VERSIONS } from '@kbn/fleet-plugin/common/constants';
import { savedSearches, dashboards } from './test_resources_data';
import { getCommonRequestHeader } from './common_api';
import { MlApi } from './api';
import { FtrProviderContext } from '../../ftr_provider_context';

export enum SavedObjectType {
  CONFIG = 'config',
  DASHBOARD = 'dashboard',
  INDEX_PATTERN = 'index-pattern',
  SEARCH = 'search',
  VISUALIZATION = 'visualization',
  ML_JOB = 'ml-job',
  ML_TRAINED_MODEL_SAVED_OBJECT_TYPE = 'ml-trained-model',
  ML_MODULE_SAVED_OBJECT_TYPE = 'ml-module',
}

export type MlTestResourcesi = ProvidedType<typeof MachineLearningTestResourcesProvider>;

export function MachineLearningTestResourcesProvider(
  { getService }: FtrProviderContext,
  mlApi: MlApi
) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const supertest = getService('supertest');
  const retry = getService('retry');

  return {
    async setKibanaTimeZoneToUTC() {
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
      });
    },

    async resetKibanaTimeZone() {
      await kibanaServer.uiSettings.unset('dateFormat:tz');
    },

    async disableKibanaAnnouncements() {
      await kibanaServer.uiSettings.update({ hideAnnouncements: true });
    },

    async resetKibanaAnnouncements() {
      await kibanaServer.uiSettings.unset('hideAnnouncements');
    },

    async savedObjectExistsById(
      id: string,
      objectType: SavedObjectType,
      space?: string
    ): Promise<boolean> {
      const response = await supertest
        .get(`${space ? `/s/${space}` : ''}/api/saved_objects/${objectType}/${id}`)
        .set(getCommonRequestHeader('1'));
      return response.status === 200;
    },

    async savedObjectExistsByTitle(
      title: string,
      objectType: SavedObjectType,
      space?: string
    ): Promise<boolean> {
      const id = await this.getSavedObjectIdByTitle(title, objectType, space);
      if (id) {
        return await this.savedObjectExistsById(id, objectType, space);
      } else {
        return false;
      }
    },

    async getSavedObjectIdByTitle(
      title: string,
      objectType: SavedObjectType,
      space?: string
    ): Promise<string | undefined> {
      log.debug(`Searching for '${objectType}' with title '${title}'...`);
      const { body: findResponse, status } = await supertest
        .get(
          `${space ? `/s/${space}` : ''}/api/saved_objects/_find?type=${objectType}&per_page=10000`
        )
        .set(getCommonRequestHeader('1'));
      mlApi.assertResponseStatusCode(200, status, findResponse);

      for (const savedObject of findResponse.saved_objects) {
        const objectTitle = savedObject.attributes.title;
        if (objectTitle === title) {
          log.debug(` > Found '${savedObject.id}'`);
          return savedObject.id;
        }
      }
      log.debug(` > Not found`);
    },

    async getSavedObjectIdsByType(objectType: SavedObjectType, space?: string): Promise<string[]> {
      const savedObjectIds: string[] = [];

      log.debug(`Searching for '${objectType}' ...`);
      const { body: findResponse, status } = await supertest
        .get(
          `${space ? `/s/${space}` : ''}/api/saved_objects/_find?type=${objectType}&per_page=10000`
        )
        .set(getCommonRequestHeader('1'));
      mlApi.assertResponseStatusCode(200, status, findResponse);

      findResponse.saved_objects.forEach((element: any) => {
        savedObjectIds.push(element.id);
      });

      return savedObjectIds;
    },

    async getDataViewId(title: string, space?: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.INDEX_PATTERN, space);
    },

    async getSavedSearchId(title: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.SEARCH);
    },

    async getVisualizationId(title: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.VISUALIZATION);
    },

    async getDashboardId(title: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.DASHBOARD);
    },

    async createDataView(title: string, timeFieldName?: string, space?: string): Promise<string> {
      log.debug(
        `Creating index pattern with title '${title}'${
          timeFieldName !== undefined ? ` and time field '${timeFieldName}'` : ''
        }`
      );

      const { body: createResponse, status } = await supertest
        .post(`${space ? `/s/${space}` : ''}/api/saved_objects/${SavedObjectType.INDEX_PATTERN}`)
        .set(getCommonRequestHeader('1'))
        .send({ attributes: { title, timeFieldName } });
      mlApi.assertResponseStatusCode(200, status, createResponse);

      await this.assertDataViewExistByTitle(title, space);

      log.debug(` > Created with id '${createResponse.id}'`);
      return createResponse.id;
    },

    async createBulkSavedObjects(body: object[]): Promise<string> {
      log.debug(`Creating bulk saved objects'`);

      const { body: createResponse, status } = await supertest
        .post(`/api/saved_objects/_bulk_create`)
        .set(getCommonRequestHeader('1'))
        .send(body);
      mlApi.assertResponseStatusCode(200, status, createResponse);

      log.debug(` > Created bulk saved objects'`);
      return createResponse;
    },

    async createDataViewIfNeeded(
      title: string,
      timeFieldName?: string,
      space?: string
    ): Promise<string> {
      const dataViewId = await this.getDataViewId(title, space);
      if (dataViewId !== undefined) {
        log.debug(`Index pattern with title '${title}' already exists. Nothing to create.`);
        return dataViewId;
      } else {
        return await this.createDataView(title, timeFieldName, space);
      }
    },

    async assertDataViewNotExist(title: string) {
      await this.assertSavedObjectNotExistsByTitle(title, SavedObjectType.INDEX_PATTERN);
    },

    async createSavedSearch(title: string, body: object): Promise<string> {
      log.debug(`Creating saved search with title '${title}'`);

      const { body: createResponse, status } = await supertest
        .post(`/api/saved_objects/${SavedObjectType.SEARCH}`)
        .set(getCommonRequestHeader('1'))
        .send(body);
      mlApi.assertResponseStatusCode(200, status, createResponse);

      await this.assertSavedSearchExistByTitle(title);

      log.debug(` > Created with id '${createResponse.id}'`);
      return createResponse.id;
    },

    async createDashboard(title: string, body: object): Promise<string> {
      log.debug(`Creating dashboard with title '${title}'`);

      const { body: createResponse, status } = await supertest
        .post(`/api/saved_objects/${SavedObjectType.DASHBOARD}`)
        .set(getCommonRequestHeader('1'))
        .send(body);
      mlApi.assertResponseStatusCode(200, status, createResponse);

      log.debug(` > Created with id '${createResponse.id}'`);
      return createResponse.id;
    },

    async createSavedSearchIfNeeded(savedSearch: any, dataViewTitle: string): Promise<string> {
      const title = savedSearch.requestBody.attributes.title;
      const savedSearchId = await this.getSavedSearchId(title);
      if (savedSearchId !== undefined) {
        log.debug(`Saved search with title '${title}' already exists. Nothing to create.`);
        return savedSearchId;
      } else {
        const body = await this.updateSavedSearchRequestBody(
          savedSearch.requestBody,
          dataViewTitle
        );
        return await this.createSavedSearch(title, body);
      }
    },

    async updateSavedSearchRequestBody(body: object, dataViewTitle: string): Promise<object> {
      const dataViewId = await this.getDataViewId(dataViewTitle);
      if (dataViewId === undefined) {
        throw new Error(
          `Index pattern '${dataViewTitle}' to base saved search on does not exist. `
        );
      }

      // inject index pattern id
      const updatedBody = JSON.parse(JSON.stringify(body), (_key, value) => {
        if (value === 'INDEX_PATTERN_ID_PLACEHOLDER') {
          return dataViewId;
        } else {
          return value;
        }
      });

      // make searchSourceJSON node a string
      const searchSourceJsonNode = updatedBody.attributes.kibanaSavedObjectMeta.searchSourceJSON;
      const searchSourceJsonString = JSON.stringify(searchSourceJsonNode);
      updatedBody.attributes.kibanaSavedObjectMeta.searchSourceJSON = searchSourceJsonString;

      return updatedBody;
    },

    async createSavedSearchFarequoteFilterIfNeeded(dataViewTitle: string = 'ft_farequote') {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteFilter, dataViewTitle);
    },

    async createMLTestDashboardIfNeeded(): Promise<string> {
      return await this.createDashboardIfNeeded(dashboards.mlTestDashboard);
    },

    async deleteMLTestDashboard() {
      await this.deleteDashboardByTitle(dashboards.mlTestDashboard.requestBody.attributes.title);
    },

    async createDashboardIfNeeded(dashboard: { requestBody: any }): Promise<string> {
      const title = dashboard.requestBody.attributes.title;
      const dashboardId = await this.getDashboardId(title);
      if (dashboardId !== undefined) {
        log.debug(`Dashboard with title '${title}' already exists. Nothing to create.`);
        return dashboardId;
      } else {
        return await this.createDashboard(title, dashboard.requestBody);
      }
    },

    async createSavedSearchFarequoteLuceneIfNeeded(dataViewTitle: string = 'ft_farequote') {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteLucene, dataViewTitle);
    },

    async createSavedSearchFarequoteKueryIfNeeded(dataViewTitle: string = 'ft_farequote') {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteKuery, dataViewTitle);
    },

    async createSavedSearchFarequoteFilterAndLuceneIfNeeded(
      dataViewTitle: string = 'ft_farequote'
    ) {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteFilterAndLucene, dataViewTitle);
    },

    async createSavedSearchFarequoteFilterAndKueryIfNeeded(dataViewTitle: string = 'ft_farequote') {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteFilterAndKuery, dataViewTitle);
    },

    async createSavedSearchFarequoteFilterTwoAndLuceneIfNeeded(
      dataViewTitle: string = 'ft_farequote'
    ) {
      await this.createSavedSearchIfNeeded(
        savedSearches.farequoteFilterTwoAndLucene,
        dataViewTitle
      );
    },

    async createSavedSearchFarequoteFilterTwoAndKueryIfNeeded(
      dataViewTitle: string = 'ft_farequote'
    ) {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteFilterTwoAndKuery, dataViewTitle);
    },

    async deleteSavedObjectById(
      id: string,
      objectType: SavedObjectType,
      force: boolean = false,
      space?: string
    ) {
      log.debug(`Deleting ${objectType} with id '${id}'...`);

      if ((await this.savedObjectExistsById(id, objectType)) === false) {
        log.debug(`${objectType} with id '${id}' does not exists. Nothing to delete.`);
        return;
      } else {
        const { body, status } = await supertest
          .delete(`${space ? `/s/${space}` : ''}/api/saved_objects/${objectType}/${id}`)
          .set(getCommonRequestHeader('1'))
          .query({ force });
        mlApi.assertResponseStatusCode(200, status, body);

        await this.assertSavedObjectNotExistsById(id, objectType, space);

        log.debug(` > Deleted ${objectType} with id '${id}'`);
      }
    },

    async deleteDataViewByTitle(title: string, space?: string) {
      log.debug(`Deleting index pattern with title '${title}'...`);

      const dataViewId = await this.getDataViewId(title, space);
      if (dataViewId === undefined) {
        log.debug(`Index pattern with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteDataViewById(dataViewId, space);
      }
    },

    async deleteDataViewById(id: string, space?: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.INDEX_PATTERN, false, space);
    },

    async deleteSavedSearchByTitle(title: string) {
      log.debug(`Deleting saved search with title '${title}'...`);

      const savedSearchId = await this.getSavedSearchId(title);
      if (savedSearchId === undefined) {
        log.debug(`Saved search with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteSavedSearchById(savedSearchId);
      }
    },

    async deleteSavedSearchById(id: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.SEARCH);
    },

    async deleteVisualizationByTitle(title: string) {
      log.debug(`Deleting visualization with title '${title}'...`);

      const visualizationId = await this.getVisualizationId(title);
      if (visualizationId === undefined) {
        log.debug(`Visualization with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteVisualizationById(visualizationId);
      }
    },

    async deleteVisualizationById(id: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.VISUALIZATION);
    },

    async deleteDashboardByTitle(title: string) {
      log.debug(`Deleting dashboard with title '${title}'...`);

      const dashboardId = await this.getDashboardId(title);
      if (dashboardId === undefined) {
        log.debug(`Dashboard with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteDashboardById(dashboardId);
      }
    },

    async deleteDashboardById(id: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.DASHBOARD);
    },

    async deleteSavedSearches() {
      for (const search of Object.values(savedSearches)) {
        await this.deleteSavedSearchByTitle(search.requestBody.attributes.title);
      }
    },

    async deleteDashboards() {
      for (const dashboard of Object.values(dashboards)) {
        await this.deleteDashboardByTitle(dashboard.requestBody.attributes.title);
      }
    },

    async assertSavedObjectExistsByTitle(
      title: string,
      objectType: SavedObjectType,
      space?: string
    ) {
      await retry.waitForWithTimeout(
        `${objectType} with title '${title}' to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsByTitle(title, objectType, space)) === true) {
            return true;
          } else {
            throw new Error(`${objectType} with title '${title}' should exist.`);
          }
        }
      );
    },

    async assertSavedObjectNotExistsByTitle(title: string, objectType: SavedObjectType) {
      await retry.waitForWithTimeout(
        `${objectType} with title '${title}' not to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsByTitle(title, objectType)) === false) {
            return true;
          } else {
            throw new Error(`${objectType} with title '${title}' should not exist.`);
          }
        }
      );
    },

    async assertSavedObjectExistsById(id: string, objectType: SavedObjectType) {
      await retry.waitForWithTimeout(
        `${objectType} with id '${id}' to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsById(id, objectType)) === true) {
            return true;
          } else {
            throw new Error(`${objectType} with id '${id}' should exist.`);
          }
        }
      );
    },

    async assertSavedObjectNotExistsById(id: string, objectType: SavedObjectType, space?: string) {
      await retry.waitForWithTimeout(
        `${objectType} with id '${id}' not to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsById(id, objectType, space)) === false) {
            return true;
          } else {
            throw new Error(`${objectType} with id '${id}' should not exist.`);
          }
        }
      );
    },

    async assertDataViewExistByTitle(title: string, space?: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.INDEX_PATTERN, space);
    },

    async assertDataViewExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.INDEX_PATTERN);
    },

    async assertSavedSearchExistByTitle(title: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.SEARCH);
    },

    async assertSavedSearchExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.SEARCH);
    },

    async assertVisualizationExistByTitle(title: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.VISUALIZATION);
    },

    async assertVisualizationExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.VISUALIZATION);
    },

    async assertDashboardExistByTitle(title: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.DASHBOARD);
    },

    async assertDashboardExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.DASHBOARD);
    },

    async deleteMlSavedObjectByJobId(jobId: string, jobType: JobType, space?: string) {
      const savedObjectId = `${jobType}-${jobId}`;
      await this.deleteSavedObjectById(savedObjectId, SavedObjectType.ML_JOB, true, space);
    },

    async cleanMLSavedObjects(additionalSpaces: string[] = []) {
      // clean default space
      await this.cleanMLJobSavedObjects();
      await this.cleanMLTrainedModelsSavedObjects();

      for (const space of additionalSpaces) {
        await this.cleanMLJobSavedObjects(space);
        await this.cleanMLTrainedModelsSavedObjects(space);
      }
    },

    async cleanMLJobSavedObjects(space?: string) {
      log.debug('Deleting ML job saved objects ...');
      const savedObjectIds = await this.getSavedObjectIdsByType(SavedObjectType.ML_JOB);
      for (const id of savedObjectIds) {
        await this.deleteSavedObjectById(id, SavedObjectType.ML_JOB, true);
      }
      log.debug('> ML job saved objects deleted.');
    },

    async cleanMLTrainedModelsSavedObjects(space?: string) {
      log.debug('Deleting ML trained model saved objects ...');
      const savedObjectIds = await this.getSavedObjectIdsByType(
        SavedObjectType.ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
        space
      );
      for (const id of savedObjectIds) {
        if (mlApi.isInternalModelId(id)) {
          log.debug(`> Skipping internal ${id}`);
          continue;
        }
        await this.deleteSavedObjectById(
          id,
          SavedObjectType.ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
          true,
          space
        );
      }
      log.debug('> ML trained model saved objects deleted.');
    },

    async setupFleet() {
      log.debug(`Setting up Fleet`);
      await retry.tryForTime(2 * 60 * 1000, async () => {
        const { body, status } = await supertest
          .post(`/api/fleet/setup`)
          .set(getCommonRequestHeader(`${API_VERSIONS.public.v1}`));
        mlApi.assertResponseStatusCode(200, status, body);
      });
      log.debug(` > Setup done`);
    },

    async installFleetPackage(packageName: string): Promise<string> {
      log.debug(`Installing Fleet package '${packageName}'`);

      const version = await this.getFleetPackageVersion(packageName);

      await retry.tryForTime(30 * 1000, async () => {
        const { body, status } = await supertest
          .post(`/api/fleet/epm/packages/${packageName}/${version}`)
          .set(getCommonRequestHeader(`${API_VERSIONS.public.v1}`));
        mlApi.assertResponseStatusCode(200, status, body);
      });

      log.debug(` > Installed`);
      return version;
    },

    async removeFleetPackage(packageName: string, version: string) {
      log.debug(`Removing Fleet package '${packageName}-${version}'`);

      await retry.tryForTime(30 * 1000, async () => {
        const { body, status } = await supertest
          .delete(`/api/fleet/epm/packages/${packageName}/${version}`)
          .set(getCommonRequestHeader(`${API_VERSIONS.public.v1}`));
        mlApi.assertResponseStatusCode(200, status, body);
      });

      log.debug(` > Removed`);
    },

    async getFleetPackageVersion(packageName: string): Promise<string> {
      log.debug(`Fetching version for Fleet package '${packageName}'`);
      let packageVersion = '';

      await retry.tryForTime(10 * 1000, async () => {
        const { body, status } = await supertest
          .get(`/api/fleet/epm/packages?experimental=true`)
          .set(getCommonRequestHeader(`${API_VERSIONS.public.v1}`));
        mlApi.assertResponseStatusCode(200, status, body);

        packageVersion =
          body.response.find(
            ({ name, version }: { name: string; version: string }) =>
              name === packageName && version
          )?.version ?? '';

        expect(packageVersion).to.not.eql(
          '',
          `Fleet package definition for '${packageName}' should exist and have a version`
        );
      });

      log.debug(` > found version '${packageVersion}'`);
      return packageVersion;
    },

    async setAdvancedSettingProperty(
      propertyName: string,
      propertyValue: string | number | boolean
    ) {
      await kibanaServer.uiSettings.update({
        [propertyName]: propertyValue,
      });
    },

    async clearAdvancedSettingProperty(propertyName: string) {
      await kibanaServer.uiSettings.unset(propertyName);
    },

    async assertModuleExists(moduleId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await mlApi.getModule(moduleId);
      });
    },
  };
}
