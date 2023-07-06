/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { RuleStatus } from '@kbn/triggers-actions-ui-plugin/public';
import { rulesLocatorID } from '../../common';
import { RULES_PATH } from '../routes/paths';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RulesParams = {
  lastResponse?: string[];
  params?: Record<string, string | number>;
  search?: string;
  status?: RuleStatus[];
  type?: string[];
};

export interface RulesLocatorParams extends RulesParams, SerializableRecord {}

export class RulesLocatorDefinition implements LocatorDefinition<RulesLocatorParams> {
  public readonly id = rulesLocatorID;

  public readonly getLocation = async ({
    lastResponse = [],
    params = {},
    search = '',
    status = [],
    type = [],
  }: RulesLocatorParams) => {
    return {
      app: 'observability',
      path: setStateToKbnUrl(
        '_a',
        {
          lastResponse,
          params,
          search,
          status,
          type,
        },
        { useHash: false, storeInHashQuery: false },
        RULES_PATH
      ),
      state: {},
    };
  };
}
