/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { checkDefaultNamespace, checkDefaultPeriod, Limits } from '../lib/utils';
import { getPodsCpu } from '../lib/pods_cpu_utils';

import { IRouter, Logger } from '@kbn/core/server';
import {
  POD_CPU_ROUTE,
} from '../../common/constants';

const limits: Limits = {
  medium: 0.7,
  high: 0.9,
};

export const registerPodsCpuRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: POD_CPU_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              name: schema.maybe(schema.string()),
              namespace: schema.maybe(schema.string()),
              period: schema.maybe(schema.string())
            }),
          },
        },
      },
      async (context, request, response) => {
        var namespace = checkDefaultNamespace(request.query.namespace);
        var period = checkDefaultPeriod(request.query.period);
        try {
          const client = (await context.core).elasticsearch.client.asCurrentUser;
          const podObjects = await getPodsCpu(client, period, request.query.name, request.query.namespace, undefined, undefined);
          if (podObjects === null) {
            var message = '';
            message = `Pod ${namespace}/${request.query.name} not found`
            if  (request.query.name === undefined){
              if (request.query.namespace === undefined){
                message = 'No pod found in the cluster';
              } else {
                message = `No pod found in ${namespace} namespace`
              }
            } else {
              if (request.query.namespace === undefined){
                message = `Pod ${request.query.name} not found in any namespace`;
              } else {
                message = `Pod ${request.query.name} not found in ${request.query.namespace} namespace`
              }
            }
            return response.ok({
              body: {
                time: '',
                message: message,
                name: request.query.name,
                namespace: namespace,
                reason: "Not found",
              },
            });
          }
          if (podObjects.pods.length === 1) {
            const pod = podObjects.pods[0];
            return response.ok({
              body: {
                'time': podObjects.time,
                'name': pod.name,
                'namespace': pod.namespace,
                'node': pod.node,
                'cpu_utilization': pod.cpu_utilization,
                'cpu_utilization_median_deviation': pod.cpu_utilization_median_deviation,
                'reason': pod.reason,
                'message': pod.message,
                'alarm': pod.alarm,
                'deviation_alarm': pod.deviation_alarm
              },
            });
          }
          return response.ok({
            body: {
              time: podObjects.time,
              pods: podObjects.pods
            },
          });
        } catch (e) { //catch error for request parameters provided
          console.log(e)
          return response.customError({ statusCode: 500, body: e });
        }
      }
    );
};
