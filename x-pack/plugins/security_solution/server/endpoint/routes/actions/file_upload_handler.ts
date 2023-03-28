/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, Logger } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type stream from 'stream';
import type { CasesByAlertId } from '@kbn/cases-plugin/common/api';
import { CommentType } from '@kbn/cases-plugin/common/api';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment/moment';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { getActionDetailsById } from '../../services';
import { APP_ID } from '../../../../common/constants';
import type {
  EndpointAction,
  EndpointActionData,
  HostMetadata,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { doLogsEndpointActionDsExists } from '../../utils';
import {
  ENDPOINT_ACTION_RESPONSES_DS,
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTIONS_INDEX,
  failedFleetActionErrorCode,
} from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { EndpointAppContext } from '../../types';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { createNewFile } from '../../services/actions/action_files';
import { BaseActionRequestSchema } from '../../../../common/endpoint/schema/actions';

const executeFileRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,

    file: schema.stream(),
  }),
};

export const registerActionFileUploadRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  const logger = endpointContext.logFactory.get('actionFileUpload');

  // UPLOAD POC ONLY
  router.post(
    {
      path: `/api/endpoint/action/upload`,
      options: {
        authRequired: true,
        tags: ['access:securitySolution'],
        // `body` setup here taken from Lists plugin
        // and also from: src/plugins/files/server/routes/file_kind/upload.ts:98
        body: {
          output: 'stream',
          // FIXME:PT `maxBytes` should be defined in the Plugin's config like other plugins do it
          maxBytes: 26214400, // 25MB payload limit
          accepts: 'application/octet-stream',
          parse: false,
        },
      },
      validate: {
        body: schema.stream(),
      },
    },
    withEndpointAuthz(
      { all: ['canWriteFileOperations'] },
      logger,
      getActionFileUploadRouteHandler(endpointContext)
    )
  );

  // POC: execute-file response action
  router.post(
    {
      path: `/api/endpoint/action/execute_file`,
      options: {
        authRequired: true,
        tags: ['access:securitySolution'],
        // `body` setup here taken from Lists plugin
        // and also from: src/plugins/files/server/routes/file_kind/upload.ts:98
        body: {
          output: 'stream',
          // FIXME:PT `maxBytes` should be defined in the Plugin's config like other plugins do it
          maxBytes: 26214400, // 25MB payload limit
          accepts: ['multipart/form-data', 'application/octet-stream'],
          parse: true,
        },
      },
      validate: executeFileRequestSchema,
    },
    withEndpointAuthz(
      { all: ['canWriteFileOperations'] },
      logger,
      getActionExecuteFileRouteHandler(endpointContext)
    )
  );
};

export const getActionFileUploadRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<undefined, unknown, unknown, SecuritySolutionRequestHandlerContext> => {
  const logger = endpointContext.logFactory.get('actionFileUpload');

  return async (context, req, res) => {
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const fileStream = req.body as stream.Readable;

    const file = await createNewFile(esClient, logger, { filename: 'some-file.sh' });
    await file.uploadContent(fileStream);

    // FIXME:PT remove this await. Only needed for POC.
    // Need this because there seems to be a delay in the file chunks being saved/propogated in ES,
    // which was causing the download link for the file uploaded to report DELETED
    await new Promise((r) => setTimeout(r, 2000));

    return res.ok({
      body: {
        message: `File with id [${file.id}] was created successfully`,
        data: file.toJSON(),
      },
    });
  };
};

export const getActionExecuteFileRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  undefined,
  unknown,
  TypeOf<typeof executeFileRequestSchema.body>,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('executeFileAction');

  return async (context, req, res) => {
    const command = 'execute-file';
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const user = endpointContext.service.security?.authc.getCurrentUser(req);
    const metadataService = endpointContext.service.getEndpointMetadataService();
    const actionID = uuidv4();

    const { file } = req.body;

    // Upload file first
    const uploadedFile = await createNewFile(esClient, logger, {
      filename: file?.hapi?.filename ?? 'some-file',
    });
    await uploadedFile.uploadContent(file as stream.Readable);

    const parameters = {
      ...(req.body.parameters ?? {}),
      file: uploadedFile.toJSON(),
    };

    // --------------------------------------------------
    //  MOST OF THE CODE BELOW WAS A COPY / PASTE
    // --------------------------------------------------

    // fetch the Agent IDs to send the commands to
    const endpointIDs = [...new Set<string>(req.body.endpoint_ids)]; // dedupe
    const endpointData = await metadataService.getMetadataForEndpoints(esClient, endpointIDs);

    const casesClient = await endpointContext.service.getCasesClient(req);

    // convert any alert IDs into cases
    let caseIDs: string[] = req.body.case_ids?.slice() || [];
    if (req.body.alert_ids && req.body.alert_ids.length > 0) {
      const newIDs: string[][] = await Promise.all(
        req.body.alert_ids.map(async (a: string) => {
          const cases: CasesByAlertId = await casesClient.cases.getCasesByAlertID({
            alertID: a,
            options: { owner: APP_ID },
          });
          return cases.map((caseInfo): string => {
            return caseInfo.id;
          });
        })
      );
      caseIDs = caseIDs.concat(...newIDs);
    }
    caseIDs = [...new Set(caseIDs)];

    let fleetActionIndexResult;
    let logsEndpointActionsResult;

    const agents = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);
    const doc = {
      '@timestamp': moment().toISOString(),
      agent: {
        id: agents,
      },
      EndpointActions: {
        action_id: actionID,
        expiration: moment().add(2, 'weeks').toISOString(),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        data: {
          command,
          comment: req.body.comment ?? undefined,
          parameters,
        } as unknown as EndpointActionData,
      } as Omit<EndpointAction, 'agents' | 'user_id' | '@timestamp'>,
      user: {
        id: user ? user.username : 'unknown',
      },
    };

    // if .logs-endpoint.actions data stream exists
    // try to create action request record in .logs-endpoint.actions DS as the current user
    // (from >= v7.16, use this check to ensure the current user has privileges to write to the new index)
    // and allow only users with superuser privileges to write to fleet indices
    const doesLogsEndpointActionsDsExist = await doLogsEndpointActionDsExists({
      esClient,
      logger,
      dataStreamName: ENDPOINT_ACTIONS_DS,
    });

    // if the new endpoint indices/data streams exists
    // write the action request to the new endpoint index
    if (doesLogsEndpointActionsDsExist) {
      try {
        logsEndpointActionsResult = await esClient.index<LogsEndpointAction>(
          {
            index: ENDPOINT_ACTIONS_INDEX,
            body: {
              ...doc,
            },
            refresh: 'wait_for',
          },
          { meta: true }
        );
        if (logsEndpointActionsResult.statusCode !== 201) {
          return res.customError({
            statusCode: 500,
            body: {
              message: logsEndpointActionsResult.body.result,
            },
          });
        }
      } catch (e) {
        return res.customError({
          statusCode: 500,
          body: { message: e },
        });
      }
    }

    // write actions to .fleet-actions index
    try {
      fleetActionIndexResult = await esClient.index<EndpointAction>(
        {
          index: AGENT_ACTIONS_INDEX,
          body: {
            ...doc.EndpointActions,
            '@timestamp': doc['@timestamp'],
            agents,
            timeout: 300, // 5 minutes
            user_id: doc.user.id,
          },
          refresh: 'wait_for',
        },
        { meta: true }
      );

      if (fleetActionIndexResult.statusCode !== 201) {
        return res.customError({
          statusCode: 500,
          body: {
            message: fleetActionIndexResult.body.result,
          },
        });
      }
    } catch (e) {
      // create entry in .logs-endpoint.action.responses-default data stream
      // when writing to .fleet-actions fails
      if (doesLogsEndpointActionsDsExist) {
        await createFailedActionResponseEntry({
          context,
          doc: {
            '@timestamp': moment().toISOString(),
            agent: doc.agent,
            EndpointActions: {
              action_id: doc.EndpointActions.action_id,
              completed_at: moment().toISOString(),
              started_at: moment().toISOString(),
              data: doc.EndpointActions.data,
            },
          },
          logger,
        });
      }
      return res.customError({
        statusCode: 500,
        body: { message: e },
      });
    }

    // Update all cases with a comment
    if (caseIDs.length > 0) {
      const targets = endpointData.map((endpt: HostMetadata) => ({
        hostname: endpt.host.hostname,
        endpointId: endpt.agent.id,
      }));

      await Promise.all(
        caseIDs.map((caseId) =>
          casesClient.attachments.add({
            caseId,
            comment: {
              type: CommentType.actions,
              comment: req.body.comment || '',
              actions: {
                targets,
                type: command,
              },
              owner: APP_ID,
            },
          })
        )
      );
    }

    const data = await getActionDetailsById(
      esClient,
      endpointContext.service.getEndpointMetadataService(),
      actionID
    );

    return res.ok({
      body: {
        data,
      },
    });
  };
};

const createFailedActionResponseEntry = async ({
  context,
  doc,
  logger,
}: {
  context: SecuritySolutionRequestHandlerContext;
  doc: LogsEndpointActionResponse;
  logger: Logger;
}): Promise<void> => {
  // 8.0+ requires internal user to write to system indices
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  try {
    await esClient.index<LogsEndpointActionResponse>({
      index: `${ENDPOINT_ACTION_RESPONSES_DS}-default`,
      body: {
        ...doc,
        error: {
          code: failedFleetActionErrorCode,
          message: 'Failed to deliver action request to fleet',
        },
      },
    });
  } catch (e) {
    logger.error(e);
  }
};
