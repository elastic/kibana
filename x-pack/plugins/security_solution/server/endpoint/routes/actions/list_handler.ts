/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../common/endpoint/constants';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { getActionList, getActionListByStatus } from '../../services';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';
import type {
  ResponseActionsApiCommandNames,
  ResponseActionStatus,
} from '../../../../common/endpoint/service/response_actions/constants';
import { doesLogsEndpointActionsIndexExist } from '../../utils';

const formatStringIds = (value: string | string[] | undefined): undefined | string[] =>
  typeof value === 'string' ? [value] : value;

const formatCommandValues = (
  value: ResponseActionsApiCommandNames | ResponseActionsApiCommandNames[] | undefined
): undefined | ResponseActionsApiCommandNames[] => (typeof value === 'string' ? [value] : value);

const formatStatusValues = (
  value: ResponseActionStatus | ResponseActionStatus[]
): ResponseActionStatus[] => (typeof value === 'string' ? [value] : value);

export const actionListHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  EndpointActionListRequestQuery,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('endpoint_action_list');

  return async (context, req, res) => {
    const {
      query: {
        agentIds: elasticAgentIds,
        page,
        pageSize,
        startDate,
        endDate,
        userIds,
        commands,
        statuses,
      },
    } = req;
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    try {
      const indexExists = await doesLogsEndpointActionsIndexExist({
        context,
        logger,
        indexName: ENDPOINT_ACTIONS_INDEX,
      });

      if (!indexExists) {
        return res.notFound({ body: 'index_not_found_exception' });
      }

      const requestParams = {
        commands: formatCommandValues(commands),
        esClient,
        elasticAgentIds: formatStringIds(elasticAgentIds),
        metadataService: endpointContext.service.getEndpointMetadataService(),
        page,
        pageSize,
        startDate,
        endDate,
        userIds: formatStringIds(userIds),
        logger,
      };

      // wrapper method to branch logic for
      // normal paged search via page, size
      // vs full search for status filters
      const getActionsLog = () => {
        if (statuses?.length) {
          return getActionListByStatus({
            ...requestParams,
            statuses: formatStatusValues(statuses),
          });
        }
        return getActionList(requestParams);
      };

      const body = await getActionsLog();
      return res.ok({
        body,
      });
    } catch (error) {
      return errorHandler(logger, res, error);
    }
  };
};
