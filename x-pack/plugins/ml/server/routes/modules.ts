/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RequestHandlerContext } from 'kibana/server';
import { DatafeedOverride, JobOverride } from '../../common/types/modules';
import { wrapError } from '../client/error_wrapper';
import { DataRecognizer } from '../models/data_recognizer';
import { getModuleIdParamSchema, setupModuleBodySchema } from './schemas/modules';
import { RouteInitialization } from '../types';

function recognize(context: RequestHandlerContext, indexPatternTitle: string) {
  const dr = new DataRecognizer(
    context.ml!.mlClient.callAsCurrentUser,
    context.core.savedObjects.client
  );
  return dr.findMatches(indexPatternTitle);
}

function getModule(context: RequestHandlerContext, moduleId: string) {
  const dr = new DataRecognizer(
    context.ml!.mlClient.callAsCurrentUser,
    context.core.savedObjects.client
  );
  if (moduleId === undefined) {
    return dr.listModules();
  } else {
    return dr.getModule(moduleId);
  }
}

function saveModuleItems(
  context: RequestHandlerContext,
  moduleId: string,
  prefix?: string,
  groups?: string[],
  indexPatternName?: string,
  query?: any,
  useDedicatedIndex?: boolean,
  startDatafeed?: boolean,
  start?: number,
  end?: number,
  jobOverrides?: JobOverride | JobOverride[],
  datafeedOverrides?: DatafeedOverride | DatafeedOverride[],
  estimateModelMemory?: boolean
) {
  const dr = new DataRecognizer(
    context.ml!.mlClient.callAsCurrentUser,
    context.core.savedObjects.client
  );
  return dr.setupModuleItems(
    moduleId,
    prefix,
    groups,
    indexPatternName,
    query,
    useDedicatedIndex,
    startDatafeed,
    start,
    end,
    jobOverrides,
    datafeedOverrides,
    estimateModelMemory
  );
}

function dataRecognizerJobsExist(context: RequestHandlerContext, moduleId: string) {
  const dr = new DataRecognizer(
    context.ml!.mlClient.callAsCurrentUser,
    context.core.savedObjects.client
  );
  return dr.dataRecognizerJobsExist(moduleId);
}

/**
 * Recognizer routes.
 */
export function dataRecognizer({ router, mlLicense }: RouteInitialization) {
  /**
   * @apiGroup Modules
   *
   * @api {get} /api/ml/modules/recognize/:indexPatternTitle Recognize index pattern
   * @apiName RecognizeIndex
   * @apiDescription Returns the list of modules that matching the index pattern.
   *
   * @apiParam {String} indexPatternTitle Index pattern title.
   */
  router.get(
    {
      path: '/api/ml/modules/recognize/{indexPatternTitle}',
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { indexPatternTitle } = request.params;
        const results = await recognize(context, indexPatternTitle);

        return response.ok({ body: results });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Modules
   *
   * @api {get} /api/ml/modules/get_module/:moduleId Get module
   * @apiName GetModule
   * @apiDescription Returns module by id.
   *
   * @apiParam {String} [moduleId] Module id
   */
  router.get(
    {
      path: '/api/ml/modules/get_module/{moduleId?}',
      validate: {
        params: schema.object({
          ...getModuleIdParamSchema(true),
        }),
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        let { moduleId } = request.params;
        if (moduleId === '') {
          // if the endpoint is called with a trailing /
          // the moduleId will be an empty string.
          moduleId = undefined;
        }
        const results = await getModule(context, moduleId);

        return response.ok({ body: results });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Modules
   *
   * @api {post} /api/ml/modules/setup/:moduleId Setup module
   * @apiName SetupModule
   * @apiDescription Created module items.
   *
   * @apiSchema (body) setupModuleBodySchema
   */
  router.post(
    {
      path: '/api/ml/modules/setup/{moduleId}',
      validate: {
        params: schema.object(getModuleIdParamSchema()),
        body: setupModuleBodySchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { moduleId } = request.params;

        const {
          prefix,
          groups,
          indexPatternName,
          query,
          useDedicatedIndex,
          startDatafeed,
          start,
          end,
          jobOverrides,
          datafeedOverrides,
          estimateModelMemory,
        } = request.body as TypeOf<typeof setupModuleBodySchema>;

        const result = await saveModuleItems(
          context,
          moduleId,
          prefix,
          groups,
          indexPatternName,
          query,
          useDedicatedIndex,
          startDatafeed,
          start,
          end,
          jobOverrides,
          datafeedOverrides,
          estimateModelMemory
        );

        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Modules
   *
   * @api {post} /api/ml/modules/jobs_exist/:moduleId Check if module jobs exist
   * @apiName CheckExistingModuleJobs
   * @apiDescription Checks if the jobs in the module have been created.
   *
   * @apiParam {String} moduleId Module id
   */
  router.get(
    {
      path: '/api/ml/modules/jobs_exist/{moduleId}',
      validate: {
        params: schema.object(getModuleIdParamSchema()),
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { moduleId } = request.params;
        const result = await dataRecognizerJobsExist(context, moduleId);

        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
