/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import assert from 'assert';
import { SavedObject } from 'kibana/server';
import moment from 'moment';
import { wrapError } from '..';
import { ReportingCore } from '../..';
import {
  API_BASE_URL_V1,
  CSV_SAVED_OBJECT_JOB_TYPE as CSV_JOB_TYPE,
} from '../../../common/constants';
import { JobParamsCsvFromSavedObject } from '../../../common/types';
import { LevelLogger } from '../../lib';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { RequestHandler } from '../lib/request_handler';

const CsvSavedSearchExportParamsSchema = schema.object({
  savedObjectId: schema.string({ minLength: 2 }),
});

const CsvSavedSearchExportBodySchema = schema.nullable(
  schema.object({
    timerange: schema.maybe(
      schema.object({
        timezone: schema.maybe(schema.string()),
        min: schema.maybe(schema.oneOf([schema.number(), schema.string({ minLength: 5 })])),
        max: schema.maybe(schema.oneOf([schema.number(), schema.string({ minLength: 5 })])),
      })
    ),
  })
);

/**
 * Register an API Endpoint for queuing report jobs
 * Only CSV export from Saved Search ID is supported.
 * @public
 */
export function registerGenerateFromSavedObject(reporting: ReportingCore, logger: LevelLogger) {
  const csvSavedSearchExportPath = `${API_BASE_URL_V1}/generate/csv/saved-object/search:{savedObjectId}`;
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  router.post(
    {
      path: csvSavedSearchExportPath,
      validate: {
        params: CsvSavedSearchExportParamsSchema,
        body: CsvSavedSearchExportBodySchema,
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // 1. Parse the optional time range for validation
      let minTime: moment.Moment | undefined;
      let maxTime: moment.Moment | undefined;
      if (req.body?.timerange?.min || req.body?.timerange?.max) {
        try {
          minTime = req.body?.timerange?.min ? moment(req.body?.timerange?.min) : minTime;
          maxTime = req.body?.timerange?.max ? moment(req.body?.timerange?.max) : maxTime;
          if (minTime) assert(minTime.isValid(), `Min time is not valid`);
          if (maxTime) assert(maxTime.isValid(), `Max time is not valid`);
        } catch (err) {
          return res.badRequest(wrapError(err));
        }
      }

      try {
        // 2. Read the saved object to get the title
        const searchObject: SavedObject<{ title?: string }> =
          await context.core.savedObjects.client.get('search', req.params.savedObjectId);

        // 3. Store the job params in the Report queue
        const requestHandler = new RequestHandler(reporting, user, context, req, res, logger);

        const jobParams: JobParamsCsvFromSavedObject = {
          browserTimezone: req.body?.timerange?.timezone || 'UTC',
          timerange: req.body?.timerange,
          savedObjectId: req.params.savedObjectId,
          title: searchObject.attributes.title ?? 'Unknown search',
          objectType: 'saved search',
          version: '7.17',
        };

        const result = await requestHandler.handleGenerateRequest(CSV_JOB_TYPE, jobParams);

        // 4. Return details of the stored report
        return res.ok({
          body: result,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err) {
        return res.customError(wrapError(err));
      }
    })
  );
}

export type CsvSavedSearchExportParamsType = TypeOf<typeof CsvSavedSearchExportParamsSchema>;
export type CsvSavedSearchExportBodyType = TypeOf<typeof CsvSavedSearchExportBodySchema>;
