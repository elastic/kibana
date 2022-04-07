/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ActionsConfigurationUtilities } from '../../../actions_config';
import { SYS_DICTIONARY_ENDPOINT } from '../../../builtin_action_types/servicenow/service';
import {
  ServiceNowPublicConfigurationType,
  SNProductsConfigValue,
  ServiceNowSecretConfigurationType,
  ExternalServiceParamsUpdate,
  GetApplicationInfoResponse,
  ImportSetApiResponseError,
  Incident,
} from '../../../builtin_action_types/servicenow/types';

import {
  createServiceError,
  getPushedDate,
  prepareIncident,
} from '../../../builtin_action_types/servicenow/utils';
import { CaseConnector } from '../../case';
import { ExternalServiceIncidentResponse } from '../../types';
import {
  applicationInformationSchema,
  importSetTableORIncidentTableResponse,
  incidentSchema,
  ServiceNowImportSetAPIResponse,
  ServiceNowImportSetAPISuccessResponse,
  ServiceNowResponse,
  ServiceNowTableAPIResponse,
} from './schema';

export class ServiceNow extends CaseConnector {
  private urls: {
    basic: string;
    importSetTableUrl: string;
    incidentViewURL: (id: string) => string;
    tableApiIncidentUrl: string;
    fieldsUrl: string;
    choicesUrl: (fields: string[]) => string;
  };
  private useTableApi: boolean;
  private appScope: string;
  private commentFieldKey: string;

  constructor({
    config,
    configurationUtilities,
    internalConfig,
    logger,
    secrets,
  }: {
    config: ServiceNowPublicConfigurationType;
    configurationUtilities: ActionsConfigurationUtilities;
    internalConfig: SNProductsConfigValue;
    logger: Logger;
    secrets: ServiceNowSecretConfigurationType;
  }) {
    const { apiUrl: url, usesTableApi: usesTableApiConfigValue } = config;
    const { username, password } = secrets;

    if (!url || !username || !password) {
      throw Error(`[Action]i18n.SERVICENOW: Wrong configuration.`);
    }

    super(configurationUtilities, logger, {
      username: secrets.username,
      password: secrets.password,
    });

    this.urls = {
      basic: url,
      importSetTableUrl: `${url}/api/now/import/${internalConfig.importSetTable}`,
      tableApiIncidentUrl: `${url}/api/now/v2/table/${internalConfig.table}`,
      incidentViewURL: (id: string) =>
        `${url}/nav_to.do?uri=${internalConfig.table}.do?sys_id=${id}`,
      fieldsUrl: `${url}/${SYS_DICTIONARY_ENDPOINT}?sysparm_query=name=task^ORname=${internalConfig.table}^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory`,
      choicesUrl: (fields: string[]) => {
        const elements = fields
          .slice(1)
          .reduce((acc, field) => `${acc}^ORelement=${field}`, `element=${fields[0]}`);

        return `${url}/api/now/table/sys_choice?sysparm_query=name=task^ORname=${internalConfig.table}^${elements}^language=en&sysparm_fields=label,value,dependent_value,element`;
      },
    };

    this.useTableApi = !internalConfig.useImportAPI || usesTableApiConfigValue;
    this.appScope = internalConfig.appScope;
    this.commentFieldKey = internalConfig.commentFieldKey;
  }

  public addComment({ incidentId, comment }: { incidentId: string; comment: string }) {
    return this.updateIncident({ incidentId, incident: { [this.commentFieldKey]: comment } });
  }

  public async getIncident({ id }: { id: string }): Promise<ExternalServiceIncidentResponse> {
    try {
      const res = await this.request({
        url: `${this.urls.tableApiIncidentUrl}/${id}`,
        method: 'get',
        responseSchema: incidentSchema,
      });

      return {
        title: res.data.result.number,
        id: res.data.result.sys_id,
        pushedDate: getPushedDate(res.data.result.sys_created_on),
        url: this.urls.incidentViewURL(res.data.result.sys_id),
      };
    } catch (error) {
      throw createServiceError(error, `Unable to get incident with id ${id}`);
    }
  }

  private isTableAPIResponse = (res: ServiceNowResponse): res is ServiceNowTableAPIResponse =>
    this.useTableApi;

  public async createIncident(
    incident: Partial<Incident>
  ): Promise<ExternalServiceIncidentResponse> {
    try {
      await this.checkIfApplicationIsInstalled();

      const res = await this.request({
        url: this.useTableApi ? this.urls.tableApiIncidentUrl : this.urls.importSetTableUrl,
        method: 'post',
        data: prepareIncident(this.useTableApi, incident),
        responseSchema: importSetTableORIncidentTableResponse,
      });

      if (!this.isTableAPIResponse(res.data)) {
        this.throwIfImportSetApiResponseIsAnError(res.data);
      }

      const incidentId = this.isTableAPIResponse(res.data)
        ? res.data.result.sys_id
        : res.data.result[0].sys_id;
      const insertedIncident = await this.getIncident({ id: incidentId });

      return {
        ...insertedIncident,
      };
    } catch (error) {
      throw createServiceError(error, 'Unable to create incident');
    }
  }

  // TODO need to add validation
  public async updateIncident({ incidentId, incident }: ExternalServiceParamsUpdate) {
    try {
      await this.checkIfApplicationIsInstalled();

      const res = await this.request({
        url: this.useTableApi
          ? `${this.urls.tableApiIncidentUrl}/${incidentId}`
          : this.urls.importSetTableUrl,
        // Import Set API supports only POST.
        method: this.useTableApi ? 'patch' : 'post',
        data: {
          ...prepareIncident(this.useTableApi, incident),
          // elastic_incident_id is used to update the incident when using the Import Set API.
          ...(this.useTableApi ? {} : { elastic_incident_id: incidentId }),
        },
        responseSchema: importSetTableORIncidentTableResponse,
      });

      if (!this.isTableAPIResponse(res.data)) {
        this.throwIfImportSetApiResponseIsAnError(res.data);
      }

      const id = this.isTableAPIResponse(res.data)
        ? res.data.result.sys_id
        : res.data.result[0].sys_id;

      const updatedIncident = await this.getIncident({ id });

      return {
        ...updatedIncident,
      };
    } catch (error) {
      throw createServiceError(error, `Unable to update incident with id ${incidentId}`);
    }
  }

  private async checkIfApplicationIsInstalled(): Promise<void> {
    if (!this.useTableApi) {
      const { version, scope } = await this.getApplicationInformation(this.appScope);
      this.logger.debug(
        `Create incident: Application scope: ${scope}: Application version${version}`
      );
    }
  }

  private async getApplicationInformation(appScope: string): Promise<GetApplicationInfoResponse> {
    const versionUrl = `${this.urls.basic}/api/${appScope}/elastic_api/health`;
    try {
      const res = await this.request({
        url: versionUrl,
        method: 'get',
        responseSchema: applicationInformationSchema,
      });

      return { ...res.data.result };
    } catch (error) {
      throw createServiceError(error, 'Unable to get application version');
    }
  }

  private throwIfImportSetApiResponseIsAnError(
    res: ServiceNowImportSetAPIResponse
  ): asserts res is ServiceNowImportSetAPISuccessResponse {
    if (res.result.length === 0) {
      throw new Error('Unexpected result');
    }

    const data = res.result[0] as ImportSetApiResponseError['result'][0];

    // Create ResponseError message?
    if (data.status === 'error') {
      throw new Error(data.error_message);
    }
  }
}
