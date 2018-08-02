/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { StickyProperties } from '../../../shared/StickyProperties';
import Waterfall from './Waterfall';
import { getServiceColors } from './getServiceColors';
import ServiceLegends from './ServiceLegends';

function Trace({ trace, services, waterfallItems, urlParams, location }) {
  const stickyProperties = [
    {
      label: 'Timestamp',
      fieldName: '@timestamp',
      val: trace.time
    },
    {
      fieldName: 'trace.duration',
      label: 'Duration',
      val: trace.duration
    }
  ];

  const serviceColors = getServiceColors(services);

  return (
    <div>
      <StickyProperties stickyProperties={stickyProperties} />
      <ServiceLegends serviceColors={serviceColors} />
      <Waterfall
        location={location}
        serviceColors={serviceColors}
        trace={trace}
        urlParams={urlParams}
        waterfallItems={waterfallItems}
      />
    </div>
  );
}

Trace.propTypes = {
  location: PropTypes.object.isRequired,
  services: PropTypes.array.isRequired,
  trace: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired,
  waterfallItems: PropTypes.array.isRequired
};

export default Trace;
