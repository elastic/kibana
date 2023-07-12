/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { BudgetingMethod, Indicator, TimeWindow } from '@kbn/slo-schema';
import type { RecursivePartial } from '@elastic/charts';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { OBSERVABILITY_APP_BASE_PATH } from '../../constants';

interface CreateSLOForm {
  name: string;
  description: string;
  indicator: Indicator;
  timeWindow: {
    duration: string;
    type: TimeWindow;
  };
  tags: string[];
  budgetingMethod: BudgetingMethod;
  objective: {
    target: number;
    timesliceTarget?: number;
    timesliceWindow?: string;
  };
}

export const observabilitySloEditLocatorID = 'SLO_EDIT_LOCATOR';

const SLOS_PATH = `${OBSERVABILITY_APP_BASE_PATH}/slos`;

export type SloEditParams = RecursivePartial<CreateSLOForm>;

export interface SloEditLocatorParams extends SloEditParams, SerializableRecord {}

export class SloEditLocatorDefinition implements LocatorDefinition<SloEditLocatorParams> {
  public readonly id = observabilitySloEditLocatorID;

  public readonly getLocation = async (slo: SloEditLocatorParams) => {
    return {
      app: 'observability',
      path: setStateToKbnUrl<SloEditParams>(
        '_a',
        {
          ...slo,
        },
        { useHash: false, storeInHashQuery: false },
        slo.id ? `${SLOS_PATH}/edit/${encodeURI(String(slo.id))}` : `${SLOS_PATH}/create`
      ),
      state: {},
    };
  };
}
