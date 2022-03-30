/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from 'src/plugins/share/common';
import type { SerializableRecord } from '@kbn/utility-types';
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';

const serviceOverViewTab = t.keyof({
  transactions: null,
  metrics: null,
  logs: null,
});

export const APM_APP_LOCATOR = 'APM_LOCATOR';

type ServiceOverViewTab = t.TypeOf<typeof serviceOverViewTab>;

export interface ServiceViewLocatorParams extends SerializableRecord {
  serviceName?: string;
  serviceOverViewActiveTab?: ServiceOverViewTab;
}

export type APMLocatorParams = ServiceViewLocatorParams;

export class APMLocatorDefinition
  implements LocatorDefinition<APMLocatorParams>
{
  public readonly id = APM_APP_LOCATOR;

  public readonly getLocation = async ({
    serviceName,
    serviceOverViewActiveTab,
  }: APMLocatorParams) => {
    let path;
    if (
      serviceName &&
      serviceOverViewActiveTab &&
      isRight(serviceOverViewTab.decode(serviceOverViewActiveTab))
    ) {
      path = `/services/${encodeURIComponent(serviceName)}/${encodeURIComponent(
        serviceOverViewActiveTab
      )}`;
    } else if (serviceName) {
      path = `/services/${encodeURIComponent(serviceName)}/overview`;
    } else {
      path = '/';
    }

    return {
      app: 'apm',
      path,
      state: {},
    };
  };
}
