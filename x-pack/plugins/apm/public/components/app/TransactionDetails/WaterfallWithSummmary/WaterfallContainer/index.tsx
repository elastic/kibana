/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import React from 'react';
import { IUrlParams } from '../../../../../context/url_params_context/types';
import { ServiceLegends } from './ServiceLegends';
import { IWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';
import { Waterfall } from './Waterfall';

interface Props {
  urlParams: IUrlParams;
  location: Location;
  waterfall: IWaterfall;
  exceedsMax: boolean;
}

export function WaterfallContainer({
  location,
  urlParams,
  waterfall,
  exceedsMax,
}: Props) {
  if (!waterfall) {
    return null;
  }

  return (
    <div>
      <ServiceLegends serviceColors={waterfall.serviceColors} />
      <Waterfall
        location={location}
        waterfallItemId={urlParams.waterfallItemId}
        waterfall={waterfall}
        exceedsMax={exceedsMax}
      />
    </div>
  );
}
