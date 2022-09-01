/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { Observable, ExternalServiceSIR, ObservableResponse, ServiceFactory } from './types';

import { createExternalService } from './service';
import { createServiceError } from './utils';

const getAddObservableToIncidentURL = (url: string, incidentID: string) =>
  `${url}/api/x_elas2_sir_int/elastic_api/incident/${incidentID}/observables`;

const getBulkAddObservableToIncidentURL = (url: string, incidentID: string) =>
  `${url}/api/x_elas2_sir_int/elastic_api/incident/${incidentID}/observables/bulk`;

export const createExternalServiceSIR: ServiceFactory<ExternalServiceSIR> = ({
  credentials,
  logger,
  configurationUtilities,
  serviceConfig,
  axiosInstance,
}): ExternalServiceSIR => {
  const snService = createExternalService({
    credentials,
    logger,
    configurationUtilities,
    serviceConfig,
    axiosInstance,
  });

  const _addObservable = async (data: Observable | Observable[], url: string) => {
    snService.checkIfApplicationIsInstalled();

    const res = await request({
      axios: axiosInstance,
      url,
      logger,
      method: 'post',
      data,
      configurationUtilities,
    });

    snService.checkInstance(res);
    return res.data.result;
  };

  const addObservableToIncident = async (
    observable: Observable,
    incidentID: string
  ): Promise<ObservableResponse> => {
    try {
      return await _addObservable(
        observable,
        getAddObservableToIncidentURL(snService.getUrl(), incidentID)
      );
    } catch (error) {
      throw createServiceError(
        error,
        `Unable to add observable to security incident with id ${incidentID}`
      );
    }
  };

  const bulkAddObservableToIncident = async (
    observables: Observable[],
    incidentID: string
  ): Promise<ObservableResponse[]> => {
    try {
      return await _addObservable(
        observables,
        getBulkAddObservableToIncidentURL(snService.getUrl(), incidentID)
      );
    } catch (error) {
      throw createServiceError(
        error,
        `Unable to add observables to security incident with id ${incidentID}`
      );
    }
  };
  return {
    ...snService,
    addObservableToIncident,
    bulkAddObservableToIncident,
  };
};
