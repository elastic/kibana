/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { RecursivePartial } from '@elastic/charts';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { sloEditLocatorID } from '@kbn/observability-plugin/common';
import type { CreateSLOForm } from '../pages/slo_edit/types';
import { SLO_CREATE_PATH } from '../../common/locators/paths';

export type SloEditParams = RecursivePartial<CreateSLOForm>;

export interface SloEditLocatorParams extends SloEditParams, SerializableRecord {}

export class SloEditLocatorDefinition implements LocatorDefinition<SloEditLocatorParams> {
  public readonly id = sloEditLocatorID;

  public readonly getLocation = async (slo: SloEditLocatorParams) => {
    return {
      app: 'slo',
      path: setStateToKbnUrl<SloEditParams>(
        '_a',
        {
          ...slo,
        },
        { useHash: false, storeInHashQuery: false },
        slo.id ? `/edit/${encodeURIComponent(String(slo.id))}` : `${SLO_CREATE_PATH}`
      ),
      state: {},
    };
  };
}
