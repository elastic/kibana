/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { AxiosBasicCredentials, AxiosResponse } from 'axios';
import { ActionsConfigurationUtilities } from '../../../actions_config';
import { SYS_DICTIONARY_ENDPOINT } from '../../../builtin_action_types/servicenow/service';
import {
  ExecutorParams,
  GetApplicationInfoResponse,
  ImportSetApiResponse,
  ImportSetApiResponseError,
  Incident,
  ServiceNowIncident,
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  SNProductsConfigValue,
} from '../../../builtin_action_types/servicenow/types';
import {
  createServiceError,
  getPushedDate,
  prepareIncident,
} from '../../../builtin_action_types/servicenow/utils';
import { CaseConnector } from '../../case';

export class ServiceNow extends CaseConnector<ServiceNowIncident> {
  private secrets: ServiceNowSecretConfigurationType;
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

  constructor({
    config,
    configurationUtilities,
    internalConfig,
    logger,
    params,
    secrets,
  }: {
    config: ServiceNowPublicConfigurationType;
    configurationUtilities: ActionsConfigurationUtilities;
    internalConfig: SNProductsConfigValue;
    logger: Logger;
    params: ExecutorParams;
    secrets: ServiceNowSecretConfigurationType;
  }) {
    const { apiUrl: url, usesTableApi: usesTableApiConfigValue } = config;
    const { username, password } = secrets;

    if (!url || !username || !password) {
      throw Error(`[Action]i18n.SERVICENOW: Wrong configuration.`);
    }

    super(configurationUtilities, logger);
    this.secrets = secrets;

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
  }

  getBasicAuth(): AxiosBasicCredentials {
    return { username: this.secrets.username, password: this.secrets.password };
  }

  async getIncident(id: string): Promise<ServiceNowIncident> {
    try {
      const res = await this.request({
        url: `${this.urls.tableApiIncidentUrl}/${id}`,
        method: 'get',
      });

      this.checkInstance(res);

      return { ...res.data.result };
    } catch (error) {
      throw createServiceError(error, `Unable to get incident with id ${id}`);
    }
  }

  async createIncident(incident: Partial<Incident>): Promise<ServiceNowIncident> {
    try {
      await this.checkIfApplicationIsInstalled();

      const res = await this.request({
        url: this.useTableApi ? this.urls.tableApiIncidentUrl : this.urls.importSetTableUrl,
        method: 'post',
        data: prepareIncident(this.useTableApi, incident),
      });

      this.checkInstance(res);

      if (!this.useTableApi) {
        this.throwIfImportSetApiResponseIsAnError(res.data);
      }

      const incidentId = this.useTableApi ? res.data.result.sys_id : res.data.result[0].sys_id;
      const insertedIncident = await this.getIncident(incidentId);

      return {
        title: insertedIncident.number,
        id: insertedIncident.sys_id,
        pushedDate: getPushedDate(insertedIncident.sys_created_on),
        url: this.urls.incidentViewURL(insertedIncident.sys_id),
      } as unknown as ServiceNowIncident;
    } catch (error) {
      throw createServiceError(error, 'Unable to create incident');
    }
  }

  async checkIfApplicationIsInstalled(): Promise<void> {
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
      });

      this.checkInstance(res);

      return { ...res.data.result };
    } catch (error) {
      throw createServiceError(error, 'Unable to get application version');
    }
  }

  private checkInstance(res: AxiosResponse) {
    if (res.status >= 200 && res.status < 400 && res.data.result == null) {
      throw new Error(
        `There is an issue with your Service Now Instance. Please check ${
          res.request?.connection?.servername ?? ''
        }.`
      );
    }
  }

  private throwIfImportSetApiResponseIsAnError(res: ImportSetApiResponse) {
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
