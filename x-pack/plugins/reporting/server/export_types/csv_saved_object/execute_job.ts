/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import type { SearchSourceFields } from 'src/plugins/data/common';
import type { VisualizationSavedObjectAttributes } from 'src/plugins/visualizations/common';
import { DeepPartial } from 'utility-types';
import { JobParamsCSV } from '../..';
import { injectReferences, parseSearchSourceJSON } from '../../../../../../src/plugins/data/common';
import { CSV_JOB_TYPE } from '../../../common/constants';
import { getFieldFormats } from '../../services';
import type { RunTaskFn, RunTaskFnFactory } from '../../types';
import { decryptJobHeaders } from '../common';
import { CsvGenerator } from '../csv_searchsource/generate_csv';
import { getSharingData } from './lib';
import type { TaskPayloadCsvFromSavedObject } from './types';

type RunTaskFnType = RunTaskFn<TaskPayloadCsvFromSavedObject>;
type SavedSearchObjectType = SavedObject<
  VisualizationSavedObjectAttributes & { columns?: string[]; sort: Array<[string, string]> }
>;
type ParsedSearchSourceJSON = SearchSourceFields & { indexRefName?: string };

function isSavedObject(
  savedSearch: SavedSearchObjectType | unknown
): savedSearch is SavedSearchObjectType {
  return (
    (savedSearch as DeepPartial<SavedSearchObjectType> | undefined)?.attributes
      ?.kibanaSavedObjectMeta?.searchSourceJSON != null
  );
}

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFnType> = (reporting, _logger) => {
  const config = reporting.getConfig();

  return async function runTask(jobId, job, cancellationToken, stream) {
    const logger = _logger.clone([CSV_JOB_TYPE, 'execute-job', jobId]);

    const encryptionKey = config.get('encryptionKey');
    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = reporting.getFakeRequest({ headers }, job.spaceId, logger);
    const uiSettings = await reporting.getUiSettingsClient(fakeRequest, logger);
    const savedObjects = await reporting.getSavedObjectsClient(fakeRequest);
    const dataPluginStart = await reporting.getDataService();
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const [es, searchSourceStart] = await Promise.all([
      (await reporting.getEsClient()).asScoped(fakeRequest),
      await dataPluginStart.search.searchSource.asScoped(fakeRequest),
    ]);

    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(fakeRequest),
      es,
    };
    const dependencies = {
      searchSourceStart,
      fieldFormatsRegistry,
    };

    // Get the Saved Search Fields object from ID
    const savedSearch = await savedObjects.get('search', job.savedObjectId);

    if (!isSavedObject(savedSearch)) {
      throw new Error(`Saved search object is not valid`);
    }

    // allowed to throw an Invalid JSON error if the JSON is not parseable.
    const searchSourceFields: ParsedSearchSourceJSON = parseSearchSourceJSON(
      savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON
    );

    const indexRefName = searchSourceFields.indexRefName;
    if (!indexRefName) {
      throw new Error(`Saved Search data is missing a reference to an Index Pattern!`);
    }

    // Inject references into the Saved Search Fields
    const searchSourceFieldsWithRefs = injectReferences(
      { ...searchSourceFields, indexRefName },
      savedSearch.references ?? []
    );

    // Form the Saved Search attributes and SearchSource into a config that's compatible with CsvGenerator
    const { columns, searchSource } = await getSharingData(
      { uiSettings },
      await searchSourceStart.create(searchSourceFieldsWithRefs),
      savedSearch,
      job.timerange
    );

    const jobParamsCsv: JobParamsCSV = { ...job, columns, searchSource };
    const csv = new CsvGenerator(
      jobParamsCsv,
      config,
      clients,
      dependencies,
      cancellationToken,
      logger,
      stream
    );
    return await csv.generateData();
  };
};
