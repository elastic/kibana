/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type {
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { DatafeedOverride, JobOverride } from '../../common/types/modules';
import { wrapError } from '../client/error_wrapper';
import { dataRecognizerFactory } from '../models/data_recognizer';
import {
  moduleIdParamSchema,
  optionalModuleIdParamSchema,
  modulesIndexPatternTitleSchema,
  setupModuleBodySchema,
} from './schemas/modules';
import type { RouteInitialization } from '../types';
import type { MlClient } from '../lib/ml_client';
import type { MLSavedObjectService } from '../saved_objects';

function recognize(
  client: IScopedClusterClient,
  mlClient: MlClient,
  savedObjectsClient: SavedObjectsClientContract,
  dataViewsService: DataViewsService,
  mlSavedObjectService: MLSavedObjectService,
  request: KibanaRequest,
  indexPatternTitle: string
) {
  const dr = dataRecognizerFactory(
    client,
    mlClient,
    savedObjectsClient,
    dataViewsService,
    mlSavedObjectService,
    request
  );
  return dr.findMatches(indexPatternTitle);
}

function getModule(
  client: IScopedClusterClient,
  mlClient: MlClient,
  savedObjectsClient: SavedObjectsClientContract,
  dataViewsService: DataViewsService,
  mlSavedObjectService: MLSavedObjectService,
  request: KibanaRequest,
  moduleId?: string
) {
  const dr = dataRecognizerFactory(
    client,
    mlClient,
    savedObjectsClient,
    dataViewsService,
    mlSavedObjectService,
    request
  );
  if (moduleId === undefined) {
    return dr.listModules();
  } else {
    return dr.getModule(moduleId);
  }
}

function setup(
  client: IScopedClusterClient,
  mlClient: MlClient,
  savedObjectsClient: SavedObjectsClientContract,
  dataViewsService: DataViewsService,
  mlSavedObjectService: MLSavedObjectService,
  request: KibanaRequest,
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
  estimateModelMemory?: boolean,
  applyToAllSpaces?: boolean
) {
  const dr = dataRecognizerFactory(
    client,
    mlClient,
    savedObjectsClient,
    dataViewsService,
    mlSavedObjectService,
    request
  );
  return dr.setup(
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
    estimateModelMemory,
    applyToAllSpaces
  );
}

function dataRecognizerJobsExist(
  client: IScopedClusterClient,
  mlClient: MlClient,
  savedObjectsClient: SavedObjectsClientContract,
  dataViewsService: DataViewsService,
  mlSavedObjectService: MLSavedObjectService,
  request: KibanaRequest,
  moduleId: string
) {
  const dr = dataRecognizerFactory(
    client,
    mlClient,
    savedObjectsClient,
    dataViewsService,
    mlSavedObjectService,
    request
  );
  return dr.dataRecognizerJobsExist(moduleId);
}

/**
 * Recognizer routes.
 */
export function dataRecognizer({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup Modules
   *
   * @api {get} /api/ml/modules/recognize/:indexPatternTitle Recognize index pattern
   * @apiName RecognizeIndex
   * @apiDescription By supplying an index pattern, discover if any of the modules are a match for data in that index.
   * @apiSchema (params) modulesIndexPatternTitleSchema
   * @apiSuccess {object[]} modules Array of objects describing the modules which match the index pattern, sorted by module ID.
   * @apiSuccessExample {json} Success-Response:
   * [{
   *    "id": "nginx_ecs",
   *    "title": "Nginx access logs",
   *     "query": {
   *        "bool": {
   *          "filter": [
   *             { "term":  { "event.dataset": "nginx.access" } },
   *             { "exists": { "field": "source.address" } },
   *             { "exists": { "field": "url.original" } },
   *             { "exists": { "field": "http.response.status_code" } }
   *          ]
   *        }
   *     },
   *     "description": "Find unusual activity in HTTP access logs from filebeat (ECS)",
   *     "logo": {
   *     "icon": "logoNginx"
   *   }
   * }]
   */
  router.get(
    {
      path: '/api/ml/modules/recognize/{indexPatternTitle}',
      validate: {
        params: modulesIndexPatternTitleSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(
      async ({
        client,
        mlClient,
        request,
        response,
        context,
        mlSavedObjectService,
        getDataViewsService,
      }) => {
        try {
          const { indexPatternTitle } = request.params;
          const dataViewService = await getDataViewsService();
          const results = await recognize(
            client,
            mlClient,
            context.core.savedObjects.client,
            dataViewService,
            mlSavedObjectService,
            request,
            indexPatternTitle
          );

          return response.ok({ body: results });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
  );

  /**
   * @apiGroup Modules
   *
   * @api {get} /api/ml/modules/get_module/:moduleId Get module
   * @apiName GetModule
   * @apiDescription Retrieve a whole ML module, containing jobs, datafeeds and saved objects. If
   *    no module ID is supplied, returns all modules.
   * @apiSchema (params) moduleIdParamSchema
   * @apiSuccess {object} module When a module ID is specified, returns a module object containing
   *      all of the jobs, datafeeds and saved objects which will be created when the module is setup.
   * @apiSuccess {object[]} modules If no module ID is supplied, an array of all modules will be returned.
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "id":"sample_data_ecommerce",
   *   "title":"Kibana sample data eCommerce",
   *   "description":"Find anomalies in eCommerce total sales data",
   *   "type":"Sample Dataset",
   *   "logoFile":"logo.json",
   *   "defaultIndexPattern":"kibana_sample_data_ecommerce",
   *   "query":{
   *     "bool":{
   *        "filter":[
   *           {
   *              "term":{
   *                 "_index":"kibana_sample_data_ecommerce"
   *              }
   *           }
   *        ]
   *     }
   *   },
   *   "jobs":[
   *      {
   *         "id":"high_sum_total_sales",
   *         "config":{
   *            "groups":[
   *               "kibana_sample_data",
   *               "kibana_sample_ecommerce"
   *            ],
   *            "description":"Find customers spending an unusually high amount in an hour",
   *            "analysis_config":{
   *               "bucket_span":"1h",
   *               "detectors":[
   *                  {
   *                     "detector_description":"High total sales",
   *                     "function":"high_sum",
   *                     "field_name":"taxful_total_price",
   *                     "over_field_name":"customer_full_name.keyword"
   *                  }
   *               ],
   *               "influencers":[
   *                  "customer_full_name.keyword",
   *                  "category.keyword"
   *               ]
   *            },
   *            "analysis_limits":{
   *               "model_memory_limit":"10mb"
   *            },
   *            "data_description":{
   *               "time_field":"order_date"
   *            },
   *            "model_plot_config":{
   *               "enabled":true
   *            },
   *            "custom_settings":{
   *               "created_by":"ml-module-sample",
   *               "custom_urls":[
   *                 {
   *                     "url_name":"Raw data",
   *                     "url_value":"kibana#/discover?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a
   *                     (index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,query:(language:kuery,query:'customer_full_name
   *                      keyword:\"$customer_full_name.keyword$\"'),sort:!('@timestamp',desc))"
   *                 },
   *                 {
   *                     "url_name":"Data dashboard",
   *                     "url_value":"kibana#/dashboard/722b74f0-b882-11e8-a6d9-e546fe2bba5f?_g=(filters:!(),time:(from:'$earliest$',
   *                        mode:absolute,to:'$latest$'))&_a=(filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f
   *                        index:'INDEX_PATTERN_ID', key:customer_full_name.keyword,negate:!f,params:(query:'$customer_full_name.keyword$')
   *                        type:phrase,value:'$customer_full_name.keyword$'),query:(match:(customer_full_name.keyword:
   *                        (query:'$customer_full_name.keyword$',type:phrase))))),query:(language:kuery, query:''))"
   *                }
   *              ]
   *            }
   *         }
   *      }
   *   ],
   *   "datafeeds":[
   *     {
   *         "id":"datafeed-high_sum_total_sales",
   *         "config":{
   *            "job_id":"high_sum_total_sales",
   *            "indexes":[
   *               "INDEX_PATTERN_NAME"
   *            ],
   *            "query":{
   *               "bool":{
   *                  "filter":[
   *                     {
   *                        "term":{ "_index":"kibana_sample_data_ecommerce" }
   *                     }
   *                  ]
   *               }
   *            }
   *         }
   *      }
   *   ],
   *   "kibana":{}
   * }
   */
  router.get(
    {
      path: '/api/ml/modules/get_module/{moduleId?}',
      validate: {
        params: optionalModuleIdParamSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(
      async ({
        client,
        mlClient,
        request,
        response,
        context,
        mlSavedObjectService,
        getDataViewsService,
      }) => {
        try {
          let { moduleId } = request.params;
          if (moduleId === '') {
            // if the endpoint is called with a trailing /
            // the moduleId will be an empty string.
            moduleId = undefined;
          }
          const dataViewService = await getDataViewsService();
          const results = await getModule(
            client,
            mlClient,
            context.core.savedObjects.client,
            dataViewService,
            mlSavedObjectService,
            request,
            moduleId
          );

          return response.ok({ body: results });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
  );

  /**
   * @apiGroup Modules
   *
   * @api {post} /api/ml/modules/setup/:moduleId Set up module
   * @apiName SetupModule
   * @apiDescription Runs the module setup process.
   *      This creates jobs, datafeeds and kibana saved objects. It allows for customization of the module,
   *      overriding the default configuration. It also allows the user to start the datafeed.
   * @apiSchema (params) moduleIdParamSchema
   * @apiSchema (body) setupModuleBodySchema
   * @apiParamExample {json} jobOverrides-no-job-ID:
   * "jobOverrides": {
   *   "analysis_limits": {
   *     "model_memory_limit": "13mb"
   *   }
   * }
   * @apiParamExample {json} jobOverrides-with-job-ID:
   * "jobOverrides": [
   *   {
   *     "analysis_limits": {
   *       "job_id": "foo"
   *       "model_memory_limit": "13mb"
   *     }
   *   }
   * ]
   * @apiParamExample {json} datafeedOverrides:
   * "datafeedOverrides": [
   *   {
   *     "scroll_size": 1001
   *   },
   *   {
   *     "job_id": "visitor_rate_ecs",
   *     "frequency": "30m"
   *   }
   * ]
   * @apiParamExample {json} query-overrrides-datafeedOverrides-query:
   * {
   *   "query": {"bool":{"must":[{"match_all":{}}]}}
   *   "datafeedOverrides": {
   *     "query": {}
   *   }
   * }
   * @apiSuccess {object} results An object containing the results of creating the items in a module,
   *      i.e. the jobs, datafeeds and saved objects. Each item is listed by id with a success flag
   *      signifying whether the creation was successful. If the item creation failed, an error object
   *      with also be supplied containing the error.
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "jobs": [{
   *      "id": "test-visitor_rate_ecs",
   *      "success": true
   *    }, {
   *      "id": "test-status_code_rate_ecs",
   *      "success": true
   *    }, {
   *      "id": "test-source_ip_url_count_ecs",
   *      "success": true
   *    }, {
   *      "id": "test-source_ip_request_rate_ecs",
   *      "success": true
   *    }, {
   *      "id": "test-low_request_rate_ecs",
   *      "success": true
   *    }],
   *   "datafeeds": [{
   *      "id": "datafeed-test-visitor_rate_ecs",
   *      "success": true,
   *      "started": false
   *    }, {
   *      "id": "datafeed-test-status_code_rate_ecs",
   *      "success": true,
   *      "started": false
   *    }, {
   *      "id": "datafeed-test-source_ip_url_count_ecs",
   *      "success": true,
   *      "started": false
   *    }, {
   *      "id": "datafeed-test-low_request_rate_ecs",
   *      "success": true,
   *      "started": false
   *    }, {
   *      "id": "datafeed-test-source_ip_request_rate_ecs",
   *      "success": true,
   *      "started": false
   *    }],
   *   "kibana": {
   *      "dashboard": [{
   *         "id": "ml_http_access_explorer_ecs",
   *         "success": true
   *      }],
   *      "search": [{
   *         "id": "ml_http_access_filebeat_ecs",
   *         "success": true
   *      }],
   *      "visualization": [{
   *         "id": "ml_http_access_map_ecs",
   *         "success": true
   *       }, {
   *         "id": "ml_http_access_source_ip_timechart_ecs",
   *         "success": true
   *       }, {
   *         "id": "ml_http_access_status_code_timechart_ecs",
   *         "success": true
   *       }, {
   *         "id": "ml_http_access_top_source_ips_table_ecs",
   *         "success": true
   *       }, {
   *         "id": "ml_http_access_top_urls_table_ecs",
   *         "success": true
   *       }, {
   *         "id": "ml_http_access_events_timechart_ecs",
   *         "success": true
   *       }, {
   *         "id": "ml_http_access_unique_count_url_timechart_ecs",
   *         "success": true
   *      }]
   *   }
   * }
   * @apiSuccessExample {json} Error-Response:
   * {
   *   "jobs": [{
   *      "id": "test-status_code_rate_ecs",
   *       "success": false,
   *       "error": {
   *         "msg": "[resource_already_exists_exception] The job cannot be created with the Id 'test-status_code_rate_ecs'. The Id is
   *         already used.",
   *         "path": "/_ml/anomaly_detectors/test-status_code_rate_ecs",
   *         "query": {},
   *         "body": "{...}",
   *         "statusCode": 400,
   *         "response": "{\"error\":{\"root_cause\":[{\"type\":\"resource_already_exists_exception\",\"reason\":\"The job cannot be created
   *            with the Id 'test-status_code_rate_ecs'. The Id is already used.\"}],\"type\":\"resource_already_exists_exception\",
   *            \"reason\":\"The job cannot be created with the Id 'test-status_code_rate_ecs'. The Id is already used.\"},\"status\":400}"
   *         }
   *       },
   *     },
   *   ...
   *   }]
   * }
   */
  router.post(
    {
      path: '/api/ml/modules/setup/{moduleId}',
      validate: {
        params: moduleIdParamSchema,
        body: setupModuleBodySchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    routeGuard.fullLicenseAPIGuard(
      async ({
        client,
        mlClient,
        request,
        response,
        context,
        mlSavedObjectService,
        getDataViewsService,
      }) => {
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
            applyToAllSpaces,
          } = request.body as TypeOf<typeof setupModuleBodySchema>;

          const dataViewService = await getDataViewsService();

          const result = await setup(
            client,
            mlClient,
            context.core.savedObjects.client,
            dataViewService,
            mlSavedObjectService,
            request,
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
            estimateModelMemory,
            applyToAllSpaces
          );

          return response.ok({ body: result });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
  );

  /**
   * @apiGroup Modules
   *
   * @api {get} /api/ml/modules/jobs_exist/:moduleId Check if module jobs exist
   * @apiName CheckExistingModuleJobs
   * @apiDescription Check whether the jobs in the module with the specified ID exist in the
   *      current list of jobs. The check runs a test to see if any of the jobs in existence
   *      have an ID which ends with the ID of each job in the module. This is done as a prefix
   *      may be supplied in the setup endpoint which is added to the start of the ID of every job in the module.
   * @apiSchema (params) moduleIdParamSchema
   * @apiSuccess {boolean} jobsExist <code>true</code> if all the jobs in the module have a matching job with an
   *      ID which ends with the job ID specified in the module, <code>false</code> otherwise.
   * @apiSuccess {Object[]} jobs  present if the jobs do all exist, with each object having keys of <code>id</code>,
   *      and optionally <code>earliestTimestampMs</code>, <code>latestTimestampMs</code>, <code>latestResultsTimestampMs</code>
   *      properties if the job has processed any data.
   * @apiSuccessExample {json} Success-Response:
   *   {
   *     "jobsExist":true,
   *     "jobs":[
   *       {
   *         "id":"nginx_low_request_rate_ecs",
   *         "earliestTimestampMs":1547016291000,
   *         "latestTimestampMs":1548256497000
   *         "latestResultsTimestampMs":1548255600000
   *       },
   *       {
   *         "id":"nginx_source_ip_request_rate_ecs",
   *         "earliestTimestampMs":1547015109000,
   *         "latestTimestampMs":1548257222000
   *         "latestResultsTimestampMs":1548255600000
   *       },
   *       {
   *         "id":"nginx_source_ip_url_count_ecs",
   *         "earliestTimestampMs":1547015109000,
   *         "latestTimestampMs":1548257222000
   *         "latestResultsTimestampMs":1548255600000
   *       },
   *       {
   *         "id":"nginx_status_code_rate_ecs",
   *         "earliestTimestampMs":1547015109000,
   *         "latestTimestampMs":1548257222000
   *         "latestResultsTimestampMs":1548255600000
   *       },
   *       {
   *         "id":"nginx_visitor_rate_ecs",
   *         "earliestTimestampMs":1547016291000,
   *         "latestTimestampMs":1548256497000
   *         "latestResultsTimestampMs":1548255600000
   *       }
   *     ]
   *  }
   */
  router.get(
    {
      path: '/api/ml/modules/jobs_exist/{moduleId}',
      validate: {
        params: moduleIdParamSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(
      async ({
        client,
        mlClient,
        request,
        response,
        context,
        mlSavedObjectService,
        getDataViewsService,
      }) => {
        try {
          const { moduleId } = request.params;
          const dataViewService = await getDataViewsService();
          const result = await dataRecognizerJobsExist(
            client,
            mlClient,
            context.core.savedObjects.client,
            dataViewService,
            mlSavedObjectService,
            request,
            moduleId
          );

          return response.ok({ body: result });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
  );
}
