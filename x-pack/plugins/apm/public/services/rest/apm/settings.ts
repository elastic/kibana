/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApi } from '../callApi';
import { CentralConfigurationIntake } from '../../../../server/lib/settings/cm/configuration';
import { CMServicesAPIResponse } from '../../../../server/lib/settings/cm/get_service_names';
import { CMSaveConfigurationAPIResponse } from '../../../../server/lib/settings/cm/save_configuration';
import { CMListAPIResponse } from '../../../../server/lib/settings/cm/list_configurations';
import { CMEnvironmentsAPIResponse } from '../../../../server/lib/settings/cm/get_environments';

export async function loadCMServices() {
  return callApi<CMServicesAPIResponse>({
    pathname: `/api/apm/settings/cm/services`
  });
}

export async function loadCMEnvironments({
  serviceName
}: {
  serviceName: string;
}) {
  return callApi<CMEnvironmentsAPIResponse>({
    pathname: `/api/apm/settings/cm/services/${serviceName}/environments`
  });
}

export async function saveCMConfiguration(
  configuration: CentralConfigurationIntake
) {
  return callApi<CMSaveConfigurationAPIResponse>({
    pathname: `/api/apm/settings/cm/new`,
    method: 'POST',
    body: JSON.stringify(configuration)
  });
}

export async function loadCMList() {
  return callApi<CMListAPIResponse>({
    pathname: `/api/apm/settings/cm`
  });
}
