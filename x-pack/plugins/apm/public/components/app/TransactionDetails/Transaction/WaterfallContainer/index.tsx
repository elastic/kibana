/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { getAgentMarks } from './get_agent_marks';
import { ServiceLegends } from './ServiceLegends';
import { Waterfall } from './Waterfall';
import { IWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  urlParams: IUrlParams;
  transaction: Transaction;
  location: Location;
  waterfall: IWaterfall;
}

export function WaterfallContainer({
  location,
  urlParams,
  transaction,
  waterfall
}: Props) {
  const agentMarks = getAgentMarks(transaction);
  if (!waterfall) {
    return null;
  }

  return (
    <div>
      <ServiceLegends serviceColors={waterfall.serviceColors} />
      <Waterfall
        agentMarks={agentMarks}
        location={location}
        serviceColors={waterfall.serviceColors}
        urlParams={urlParams}
        waterfall={waterfall}
      />
    </div>
  );
}
