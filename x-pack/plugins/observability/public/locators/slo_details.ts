/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { sloDetailsLocatorID } from '../../common';
import { SLOS_PATH } from '../../common/locators/paths';

export interface SloDetailsLocatorParams extends SerializableRecord {
  sloId?: string;
  instanceId?: string;
}

export class SloDetailsLocatorDefinition implements LocatorDefinition<SloDetailsLocatorParams> {
  public readonly id = sloDetailsLocatorID;

  public readonly getLocation = async ({ sloId, instanceId }: SloDetailsLocatorParams) => {
    const queryParams =
      !!instanceId && instanceId !== '*' ? `?instanceId=${encodeURI(instanceId)}` : '';
    const path = !!sloId ? `${SLOS_PATH}/${encodeURI(sloId)}${queryParams}` : SLOS_PATH;

    return {
      app: 'observability',
      path,
      state: {},
    };
  };
}
