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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SloDetailsParams = {
  sloId?: string;
};

export interface SloDetailsLocatorParams extends SloDetailsParams, SerializableRecord {}

export const getSloDetailsPath = (sloId: string) => {
  return `/${SLOS_PATH}/${encodeURI(sloId)}`;
};

export class SloDetailsLocatorDefinition implements LocatorDefinition<SloDetailsLocatorParams> {
  public readonly id = sloDetailsLocatorID;

  public readonly getLocation = async ({ sloId = '' }: SloDetailsLocatorParams) => {
    return {
      app: 'observability',
      path: getSloDetailsPath(sloId),
      state: {},
    };
  };
}
