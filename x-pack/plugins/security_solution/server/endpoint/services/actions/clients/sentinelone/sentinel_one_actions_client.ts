/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import { groupBy } from 'lodash';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type {
  SentinelOneGetActivitiesParams,
  SentinelOneGetActivitiesResponse,
  SentinelOneGetAgentsParams,
  SentinelOneGetAgentsResponse,
  SentinelOneDownloadAgentFileParams,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type {
  QueryDslQueryContainer,
  SearchHit,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { Readable } from 'stream';
import { ACTIONS_SEARCH_PAGE_SIZE } from '../../constants';
import type {
  NormalizedExternalConnectorClient,
  NormalizedExternalConnectorClientExecuteOptions,
} from '../lib/normalized_external_connector_client';
import { SENTINEL_ONE_ACTIVITY_INDEX_PATTERN } from '../../../../../../common';
import { catchAndWrapError } from '../../../../utils';
import type {
  CommonResponseActionMethodOptions,
  GetFileDownloadMethodResponse,
  ProcessPendingActionsMethodOptions,
} from '../lib/types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionAgentResponseEsDocNotFound, ResponseActionsClientError } from '../errors';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  SentinelOneActionRequestCommonMeta,
  SentinelOneActivityDataForType80,
  SentinelOneActivityEsDoc,
  SentinelOneGetFileRequestMeta,
  SentinelOneGetFileResponseMeta,
  SentinelOneIsolationRequestMeta,
  SentinelOneIsolationResponseMeta,
  UploadedFileInfo,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
} from '../../../../../../common/api/endpoint';
import type {
  ResponseActionsClientOptions,
  ResponseActionsClientValidateRequestResponse,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
} from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';
import { RESPONSE_ACTIONS_ZIP_PASSCODE } from '../../../../../../common/endpoint/service/response_actions/constants';

export type SentinelOneActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: NormalizedExternalConnectorClient;
};

export class SentinelOneActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'sentinel_one';
  private readonly connectorActionsClient: NormalizedExternalConnectorClient;

  constructor({ connectorActions, ...options }: SentinelOneActionsClientOptions) {
    super(options);
    this.connectorActionsClient = connectorActions;
    connectorActions.setup(SENTINELONE_CONNECTOR_ID);
  }

  private async handleResponseActionCreation<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      Partial<TMeta>
    >
  ): Promise<{
    actionEsDoc: LogsEndpointAction<TParameters, TOutputContent, TMeta>;
    actionDetails: ActionDetails<TOutputContent, TParameters>;
  }> {
    const actionRequestDoc = await this.writeActionRequestToEndpointIndex<
      TParameters,
      TOutputContent,
      TMeta
    >(reqIndexOptions);

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: reqIndexOptions.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    return {
      actionEsDoc: actionRequestDoc,
      actionDetails: await this.fetchActionDetails<ActionDetails<TOutputContent, TParameters>>(
        actionRequestDoc.EndpointActions.action_id
      ),
    };
  }

  protected async writeActionRequestToEndpointIndex<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      Partial<TMeta> // Partial<> because the common Meta properties are actually set in this method for all requests
    >
  ): Promise<
    LogsEndpointAction<TParameters, TOutputContent, TMeta & SentinelOneActionRequestCommonMeta>
  > {
    const agentUUID = actionRequest.endpoint_ids[0];
    const agentDetails = await this.getAgentDetails(agentUUID);

    const doc = await super.writeActionRequestToEndpointIndex<
      TParameters,
      TOutputContent,
      TMeta & SentinelOneActionRequestCommonMeta
    >({
      ...actionRequest,
      hosts: {
        [agentUUID]: { name: agentDetails.computerName },
      },
      meta: {
        // Add common meta data
        agentUUID,
        agentId: agentDetails.id,
        hostName: agentDetails.computerName,
        ...(actionRequest.meta ?? {}),
      } as TMeta & SentinelOneActionRequestCommonMeta,
    });

    return doc;
  }

  /**
   * Sends actions to SentinelOne directly (via Connector)
   * @private
   */
  private async sendAction<T = unknown>(
    actionType: SUB_ACTION,
    actionParams: object
  ): Promise<ActionTypeExecutorResult<T>> {
    const executeOptions: Parameters<typeof this.connectorActionsClient.execute>[0] = {
      params: {
        subAction: actionType,
        subActionParams: actionParams,
      },
    };

    this.log.debug(
      `calling connector actions 'execute()' for SentinelOne with:\n${stringify(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(stringify(actionSendResponse));

      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to SentinelOne failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    }

    this.log.debug(`Response:\n${stringify(actionSendResponse)}`);

    return actionSendResponse as ActionTypeExecutorResult<T>;
  }

  /** Gets agent details directly from SentinelOne */
  private async getAgentDetails(
    agentUUID: string
  ): Promise<SentinelOneGetAgentsResponse['data'][number]> {
    const executeOptions: NormalizedExternalConnectorClientExecuteOptions<
      SentinelOneGetAgentsParams,
      SUB_ACTION
    > = {
      params: {
        subAction: SUB_ACTION.GET_AGENTS,
        subActionParams: {
          uuid: agentUUID,
        },
      },
    };

    let s1ApiResponse: SentinelOneGetAgentsResponse | undefined;

    try {
      const response = (await this.connectorActionsClient.execute(
        executeOptions
      )) as ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;

      this.log.debug(
        `Response for SentinelOne agent id [${agentUUID}] returned:\n${stringify(response)}`
      );

      s1ApiResponse = response.data;
    } catch (err) {
      throw new ResponseActionsClientError(
        `Error while attempting to retrieve SentinelOne host with agent id [${agentUUID}]: ${err.message}`,
        500,
        err
      );
    }

    if (!s1ApiResponse || !s1ApiResponse.data[0]) {
      throw new ResponseActionsClientError(`SentinelOne agent id [${agentUUID}] not found`, 404);
    }

    return s1ApiResponse.data[0];
  }

  protected async validateRequest(
    payload: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<ResponseActionsClientValidateRequestResponse> {
    // TODO:PT support multiple agents
    if (payload.endpoint_ids.length > 1) {
      return {
        isValid: false,
        error: new ResponseActionsClientError(
          `[body.endpoint_ids]: Multiple agents IDs not currently supported for SentinelOne`,
          400
        ),
      };
    }

    return super.validateRequest(payload);
  }

  async isolate(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      {},
      SentinelOneIsolationRequestMeta
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'isolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction(SUB_ACTION.ISOLATE_HOST, { uuid: actionRequest.endpoint_ids[0] });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails, actionEsDoc: actionRequestDoc } =
      await this.handleResponseActionCreation(reqIndexOptions);

    if (
      !actionRequestDoc.error &&
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled
    ) {
      await this.writeActionResponseToEndpointIndex({
        actionId: actionRequestDoc.EndpointActions.action_id,
        agentId: actionRequestDoc.agent.id,
        data: {
          command: actionRequestDoc.EndpointActions.data.command,
        },
      });

      return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
    }

    return actionDetails;
  }

  async release(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      {},
      SentinelOneIsolationRequestMeta
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'unisolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction(SUB_ACTION.RELEASE_HOST, { uuid: actionRequest.endpoint_ids[0] });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails, actionEsDoc: actionRequestDoc } =
      await this.handleResponseActionCreation(reqIndexOptions);

    if (
      !actionRequestDoc.error &&
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled
    ) {
      await this.writeActionResponseToEndpointIndex({
        actionId: actionRequestDoc.EndpointActions.action_id,
        agentId: actionRequestDoc.agent.id,
        data: {
          command: actionRequestDoc.EndpointActions.data.command,
        },
      });

      return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
    }

    return actionDetails;
  }

  async getFile(
    actionRequest: ResponseActionGetFileRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    if (
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled
    ) {
      throw new ResponseActionsClientError(
        `get-file not supported for ${this.agentType} agent type. Feature disabled`,
        400
      );
    }

    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      ResponseActionGetFileParameters,
      ResponseActionGetFileOutputContent,
      Partial<SentinelOneGetFileRequestMeta>
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'get-file',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;
      const timestamp = new Date().toISOString();

      if (!error) {
        try {
          await this.sendAction(SUB_ACTION.FETCH_AGENT_FILES, {
            agentUUID: actionRequest.endpoint_ids[0],
            files: [actionRequest.parameters.path],
            zipPassCode: RESPONSE_ACTIONS_ZIP_PASSCODE.sentinel_one,
          });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }

      if (!error) {
        const { id: agentId } = await this.getAgentDetails(actionRequest.endpoint_ids[0]);

        const activitySearchCriteria: SentinelOneGetActivitiesParams = {
          // Activity type for fetching a file from a host machine in SentinelOne:
          // {
          //   "id": 81
          //   "action": "User Requested Fetch Files",
          //   "descriptionTemplate": "The management user {{ username }} initiated a fetch file command to the agent {{ computer_name }} ({{ external_ip }}).",
          // },
          activityTypes: '81',
          limit: 1,
          sortBy: 'createdAt',
          sortOrder: 'asc',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          createdAt__gte: timestamp,
          agentIds: agentId,
        };

        // Fetch the Activity log entry for this get-file request and store needed data
        const activityLogSearchResponse = await this.sendAction<
          SentinelOneGetActivitiesResponse<{ commandBatchUuid: string }>
        >(SUB_ACTION.GET_ACTIVITIES, activitySearchCriteria);

        this.log.debug(
          `Search of activity log with:\n${stringify(
            activitySearchCriteria
          )}\n returned:\n${stringify(activityLogSearchResponse.data)}`
        );

        if (activityLogSearchResponse.data?.data.length) {
          const activityLogItem = activityLogSearchResponse.data?.data[0];

          reqIndexOptions.meta = {
            commandBatchUuid: activityLogItem?.data.commandBatchUuid,
            activityId: activityLogItem?.id,
          };
        } else {
          this.log.warn(
            `Unable to find a fetch file command entry in SentinelOne activity log. May be unable to complete response action`
          );
        }
      }
    }

    return (
      await this.handleResponseActionCreation<
        ResponseActionGetFileParameters,
        ResponseActionGetFileOutputContent,
        SentinelOneGetFileRequestMeta
      >(reqIndexOptions)
    ).actionDetails;
  }

  async getFileInfo(actionId: string, agentId: string): Promise<UploadedFileInfo> {
    if (
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled
    ) {
      throw new ResponseActionsClientError(
        `File downloads are not supported for ${this.agentType} agent type. Feature disabled`,
        400
      );
    }
    await this.ensureValidActionId(actionId);

    const fileInfo: UploadedFileInfo = {
      actionId,
      agentId,
      id: agentId,
      agentType: this.agentType,
      status: 'AWAITING_UPLOAD',
      created: '',
      name: '',
      size: 0,
      mimeType: '',
    };

    try {
      const agentResponse = await this.fetchGetFileResponseEsDocForAgentId(actionId, agentId);

      // Unfortunately, there is no way to determine if a file is still available in SentinelOne without actually
      // calling the download API, which would return the following error:
      // {  "errors":[ {
      //      "code":4100010,
      //      "detail":"The requested files do not exist. Fetched files are deleted after 3 days, or earlier if more than 30 files are fetched.",
      //      "title":"Resource not found"
      // } ] }
      fileInfo.status = 'READY';
      fileInfo.created = agentResponse.meta?.createdAt ?? '';
      fileInfo.name = agentResponse.meta?.filename ?? '';
      fileInfo.mimeType = 'application/octet-stream';
    } catch (e) {
      // Ignore "no response doc" error for the agent and just return the file info with the status of 'AWAITING_UPLOAD'
      if (!(e instanceof ResponseActionAgentResponseEsDocNotFound)) {
        throw e;
      }
    }

    return fileInfo;
  }

  async getFileDownload(actionId: string, agentId: string): Promise<GetFileDownloadMethodResponse> {
    if (
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled
    ) {
      throw new ResponseActionsClientError(
        `File downloads are not supported for ${this.agentType} agent type. Feature disabled`,
        400
      );
    }

    await this.ensureValidActionId(actionId);

    const agentResponse = await this.fetchGetFileResponseEsDocForAgentId(actionId, agentId);

    if (!agentResponse.meta?.activityLogEntryId) {
      throw new ResponseActionsClientError(
        `Unable to retrieve file from SentinelOne. Response ES document is missing [meta.activityLogEntryId]`
      );
    }

    const downloadAgentFileMethodOptions: SentinelOneDownloadAgentFileParams = {
      agentUUID: agentId,
      activityId: agentResponse.meta?.activityLogEntryId,
    };
    const { data } = await this.sendAction<Readable>(
      SUB_ACTION.DOWNLOAD_AGENT_FILE,
      downloadAgentFileMethodOptions
    );

    if (!data) {
      throw new ResponseActionsClientError(
        `Unable to establish a readable stream for file with SentinelOne`
      );
    }

    return {
      stream: data,
      fileName: agentResponse.meta.filename,
      mimeType: undefined,
    };
  }

  async processPendingActions({
    abortSignal,
    addToQueue,
  }: ProcessPendingActionsMethodOptions): Promise<void> {
    if (abortSignal.aborted) {
      return;
    }

    for await (const pendingActions of this.fetchAllPendingActions()) {
      if (abortSignal.aborted) {
        return;
      }

      const pendingActionsByType = groupBy(pendingActions, 'EndpointActions.data.command');

      for (const [actionType, typePendingActions] of Object.entries(pendingActionsByType)) {
        if (abortSignal.aborted) {
          return;
        }

        switch (actionType as ResponseActionsApiCommandNames) {
          case 'isolate':
          case 'unisolate':
            {
              const isolationResponseDocs = await this.checkPendingIsolateOrReleaseActions(
                typePendingActions as Array<
                  LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>
                >,
                actionType as 'isolate' | 'unisolate'
              );
              if (isolationResponseDocs.length) {
                addToQueue(...isolationResponseDocs);
              }
            }
            break;

          case 'get-file':
            {
              const responseDocsForGetFile = await this.checkPendingGetFileActions(
                typePendingActions as Array<
                  LogsEndpointAction<
                    ResponseActionGetFileParameters,
                    ResponseActionGetFileOutputContent,
                    SentinelOneGetFileRequestMeta
                  >
                >
              );
              if (responseDocsForGetFile.length) {
                addToQueue(...responseDocsForGetFile);
              }
            }
            break;
        }
      }
    }
  }

  private async fetchGetFileResponseEsDocForAgentId(
    actionId: string,
    agentId: string
  ): Promise<
    LogsEndpointActionResponse<ResponseActionGetFileOutputContent, SentinelOneGetFileResponseMeta>
  > {
    const agentResponse = (
      await this.fetchActionResponseEsDocs<
        ResponseActionGetFileOutputContent,
        SentinelOneGetFileResponseMeta
      >(actionId, [agentId])
    )[agentId];

    if (!agentResponse) {
      throw new ResponseActionAgentResponseEsDocNotFound(
        `Action ID [${actionId}] for agent ID [${actionId}] is still pending`,
        404
      );
    }

    if (agentResponse.EndpointActions.data.command !== 'get-file') {
      throw new ResponseActionsClientError(
        `Invalid action ID [${actionId}] - Not a get-file action: [${agentResponse.EndpointActions.data.command}]`,
        400
      );
    }

    return agentResponse;
  }

  /**
   * Checks if the provided Isolate or Unisolate actions are complete and if so, then it builds the Response
   * document for them and returns it. (NOTE: the response is NOT written to ES - only returned)
   * @param actionRequests
   * @param command
   * @private
   */
  private async checkPendingIsolateOrReleaseActions(
    actionRequests: Array<LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>>,
    command: ResponseActionsApiCommandNames & ('isolate' | 'unisolate')
  ): Promise<LogsEndpointActionResponse[]> {
    const completedResponses: LogsEndpointActionResponse[] = [];
    const actionsByAgentId: {
      [s1AgentId: string]: Array<
        LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>
      >;
    } = {};
    const warnings: string[] = [];

    // Create the `OR` clause that filters for each agent id and an updated date of greater than the date when
    // the isolate request was created
    const agentListQuery: QueryDslQueryContainer[] = actionRequests.reduce((acc, action) => {
      const s1AgentId = action.meta?.agentId;

      if (s1AgentId) {
        if (!actionsByAgentId[s1AgentId]) {
          actionsByAgentId[s1AgentId] = [];
        }

        actionsByAgentId[s1AgentId].push(action);

        acc.push({
          bool: {
            filter: [
              { term: { 'sentinel_one.activity.agent.id': s1AgentId } },
              { range: { 'sentinel_one.activity.updated_at': { gt: action['@timestamp'] } } },
            ],
          },
        });
      } else {
        // This is an edge case and should never happen. But just in case :-)
        warnings.push(
          `${command} response action ID [${action.EndpointActions.action_id}] missing SentinelOne agent ID, thus unable to check on it's status. Forcing it to complete as failure.`
        );

        completedResponses.push(
          this.buildActionResponseEsDoc<{}, SentinelOneIsolationResponseMeta>({
            actionId: action.EndpointActions.action_id,
            agentId: Array.isArray(action.agent.id) ? action.agent.id[0] : action.agent.id,
            data: { command },
            error: {
              message: `Unable to very if action completed. SentinelOne agent id ('meta.agentId') missing on action request document!`,
            },
          })
        );
      }

      return acc;
    }, [] as QueryDslQueryContainer[]);

    if (agentListQuery.length > 0) {
      const query: QueryDslQueryContainer = {
        bool: {
          must: [
            {
              terms: {
                // Activity Types can be retrieved from S1 via API: `/web/api/v2.1/activities/types`
                'sentinel_one.activity.type':
                  command === 'isolate'
                    ? [
                        // {
                        //    "id": 1001
                        //    "action": "Agent Disconnected From Network",
                        //    "descriptionTemplate": "Agent {{ computer_name }} was disconnected from network.",
                        // },
                        1001,

                        // {
                        //    "id": 2010
                        //    "action": "Agent Mitigation Report Quarantine Network Failed",
                        //    "descriptionTemplate": "Agent {{ computer_name }} was unable to disconnect from network.",
                        // },
                        2010,
                      ]
                    : [
                        // {
                        //    "id": 1002
                        //    "action": "Agent Reconnected To Network",
                        //    "descriptionTemplate": "Agent {{ computer_name }} was connected to network.",
                        // },
                        1002,
                      ],
              },
            },
          ],
          should: agentListQuery,
          minimum_should_match: 1,
        },
      };

      const searchRequestOptions: SearchRequest = {
        index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
        query,
        // There may be many documents for each host/agent, so we collapse it and only get back the
        // first one that came in after the isolate request was sent
        collapse: {
          field: 'sentinel_one.activity.agent.id',
          inner_hits: {
            name: 'first_found',
            size: 1,
            sort: [{ 'sentinel_one.activity.updated_at': 'asc' }],
          },
        },
        // we don't need the source. The document will be stored in `inner_hits.first_found`
        // due to use of `collapse
        _source: false,
        sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        size: ACTIONS_SEARCH_PAGE_SIZE,
      };

      this.log.debug(
        `searching for ${command} responses from [${SENTINEL_ONE_ACTIVITY_INDEX_PATTERN}] index with:\n${stringify(
          searchRequestOptions,
          15
        )}`
      );

      const searchResults = await this.options.esClient
        .search<SentinelOneActivityEsDoc>(searchRequestOptions)
        .catch(catchAndWrapError);

      this.log.debug(
        `Search results for SentinelOne ${command} activity documents:\n${stringify(searchResults)}`
      );

      for (const searchResultHit of searchResults.hits.hits) {
        const isolateActivityResponseDoc = searchResultHit.inner_hits?.first_found.hits
          .hits[0] as SearchHit<SentinelOneActivityEsDoc>;

        if (isolateActivityResponseDoc && isolateActivityResponseDoc._source) {
          const s1ActivityData = isolateActivityResponseDoc._source.sentinel_one.activity;

          const elasticDocId = isolateActivityResponseDoc._id;
          const s1AgentId = s1ActivityData.agent.id;
          const activityLogEntryId = s1ActivityData.id;
          const activityLogEntryType = s1ActivityData.type;
          const activityLogEntryDescription = s1ActivityData.description.primary;

          for (const actionRequest of actionsByAgentId[s1AgentId]) {
            completedResponses.push(
              this.buildActionResponseEsDoc<{}, SentinelOneIsolationResponseMeta>({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: { command },
                error:
                  activityLogEntryType === 2010 && command === 'isolate'
                    ? {
                        message:
                          activityLogEntryDescription ??
                          `Action failed. SentinelOne activity log entry [${activityLogEntryId}] has a 'type' value of 2010 indicating a failure to disconnect`,
                      }
                    : undefined,
                meta: {
                  elasticDocId,
                  activityLogEntryId,
                  activityLogEntryType,
                  activityLogEntryDescription,
                },
              })
            );
          }
        }
      }
    } else {
      this.log.debug(`Nothing to search for. List of agents IDs is empty.`);
    }

    this.log.debug(
      `${completedResponses.length} ${command} action responses generated:\n${stringify(
        completedResponses
      )}`
    );

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }

  private async checkPendingGetFileActions(
    actionRequests: Array<
      LogsEndpointAction<
        ResponseActionGetFileParameters,
        ResponseActionGetFileOutputContent,
        SentinelOneGetFileRequestMeta
      >
    >
  ): Promise<LogsEndpointActionResponse[]> {
    const warnings: string[] = [];
    const completedResponses: LogsEndpointActionResponse[] = [];
    const actionsByAgentAndBatchId: {
      [agentIdAndCommandBatchUuid: string]: LogsEndpointAction<
        ResponseActionGetFileParameters,
        ResponseActionGetFileOutputContent,
        SentinelOneGetFileRequestMeta
      >;
    } = {};
    // Utility to create the key to lookup items in the `actionByAgentAndBatchId` grouping above
    const getLookupKey = (agentId: string, commandBatchUuid: string): string =>
      `${agentId}:${commandBatchUuid}`;
    const searchRequestOptions: SearchRequest = {
      index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
      size: ACTIONS_SEARCH_PAGE_SIZE,
      query: {
        bool: {
          must: [
            {
              term: {
                // Activity Types can be retrieved from S1 via API: `/web/api/v2.1/activities/types`
                // {
                //   "action": "Agent Uploaded Fetched Files",
                //   "descriptionTemplate": "Agent {{ computer_name }} ({{ external_ip }}) successfully uploaded {{ filename }}.",
                //   "id": 80
                // },
                'sentinel_one.activity.type': 80,
              },
            },
          ],
          should: actionRequests.reduce((acc, action) => {
            const s1AgentId = action.meta?.agentId;
            const s1CommandBatchUUID = action.meta?.commandBatchUuid;

            if (s1AgentId && s1CommandBatchUUID) {
              actionsByAgentAndBatchId[getLookupKey(s1AgentId, s1CommandBatchUUID)] = action;

              acc.push({
                bool: {
                  filter: [
                    { term: { 'sentinel_one.activity.agent.id': s1AgentId } },
                    {
                      term: {
                        'sentinel_one.activity.data.flattened.commandBatchUuid': s1CommandBatchUUID,
                      },
                    },
                  ],
                },
              });
            } else {
              // This is an edge case and should never happen. But just in case :-)
              warnings.push(
                `get-file response action ID [${action.EndpointActions.action_id}] missing SentinelOne agent ID or commandBatchUuid value(s). Unable to check on it's status - forcing it to complete as a failure.`
              );

              completedResponses.push(
                this.buildActionResponseEsDoc<{}, {}>({
                  actionId: action.EndpointActions.action_id,
                  agentId: Array.isArray(action.agent.id) ? action.agent.id[0] : action.agent.id,
                  data: { command: 'get-file' },
                  error: {
                    message: `Unable to very if action completed. SentinelOne agent id or commandBatchUuid missing on action request document!`,
                  },
                })
              );
            }

            return acc;
          }, [] as QueryDslQueryContainer[]),
          minimum_should_match: 1,
        },
      },
    };

    if (Object.keys(actionsByAgentAndBatchId).length) {
      this.log.debug(
        `searching for get-file responses from [${SENTINEL_ONE_ACTIVITY_INDEX_PATTERN}] index with:\n${stringify(
          searchRequestOptions,
          15
        )}`
      );

      const searchResults = await this.options.esClient
        .search<SentinelOneActivityEsDoc<SentinelOneActivityDataForType80>>(searchRequestOptions)
        .catch(catchAndWrapError);

      this.log.debug(
        `Search results for SentinelOne get-file activity documents:\n${stringify(searchResults)}`
      );

      for (const s1Hit of searchResults.hits.hits) {
        const s1ActivityDoc = s1Hit._source;
        const s1AgentId = s1ActivityDoc?.sentinel_one.activity.agent.id;
        const s1CommandBatchUuid =
          s1ActivityDoc?.sentinel_one.activity.data.flattened.commandBatchUuid ?? '';
        const activityLogEntryId = s1ActivityDoc?.sentinel_one.activity.id ?? '';

        if (s1AgentId && s1CommandBatchUuid) {
          const actionRequest =
            actionsByAgentAndBatchId[getLookupKey(s1AgentId, s1CommandBatchUuid)];

          if (actionRequest) {
            const downloadUrl = s1ActivityDoc?.sentinel_one.activity.data.downloaded.url ?? '';
            const error = !downloadUrl
              ? {
                  message: `File retrieval failed (No download URL defined in SentinelOne activity log id [${activityLogEntryId}])`,
                }
              : undefined;

            completedResponses.push(
              this.buildActionResponseEsDoc<
                ResponseActionGetFileOutputContent,
                SentinelOneGetFileResponseMeta
              >({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: {
                  command: 'get-file',
                  comment: s1ActivityDoc?.sentinel_one.activity.description.primary ?? '',
                  output: {
                    type: 'json',
                    content: {
                      // code applies only to Endpoint agents
                      code: '',
                      // We don't know the file size for S1 retrieved files
                      zip_size: 0,
                      // We don't have the contents of the zip file for S1
                      contents: [],
                    },
                  },
                },
                error,
                meta: {
                  activityLogEntryId,
                  elasticDocId: s1Hit._id,
                  downloadUrl,
                  createdAt: s1ActivityDoc?.sentinel_one.activity.updated_at ?? '',
                  filename: s1ActivityDoc?.sentinel_one.activity.data.flattened.filename ?? '',
                },
              })
            );
          } else {
            warnings.push(
              `Activity log entry ${s1Hit._id} was a matched, but no action request for it (should not happen)`
            );
          }
        }
      }
    } else {
      this.log.debug(`Nothing to search for. No pending get-file actions`);
    }

    this.log.debug(
      `${completedResponses.length} get-file action responses generated:\n${stringify(
        completedResponses
      )}`
    );

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }
}
