/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for listing pairs of information about the detector for which
 * rules are being edited.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiDescriptionList,
} from '@elastic/eui';

import { formatValue } from '../../../../formatters/format_value';

import './styles/main.less';

export function DetectorDescriptionList({
  job,
  detector,
  anomaly, }) {

  const listItems = [
    {
      title: 'Job ID',
      description: job.job_id,
    },
    {
      title: 'Detector',
      description: detector.detector_description,
    }
  ];

  if (anomaly.actual !== undefined) {
    // Format based on magnitude of value at this stage, rather than using the
    // Kibana field formatter (if set) which would add complexity converting
    // the entered value to / from e.g. bytes.
    const actual = formatValue(anomaly.actual, anomaly.source.function);
    const typical = formatValue(anomaly.typical, anomaly.source.function);

    listItems.push(
      {
        title: 'Selected anomaly',
        description: `actual ${actual}, typical ${typical}`,
      }
    );
  }

  return (
    <EuiDescriptionList
      className="rule-detector-description-list"
      type="column"
      listItems={listItems}
    />
  );
}
DetectorDescriptionList.propTypes = {
  job: PropTypes.object.isRequired,
  detector: PropTypes.object.isRequired,
  anomaly: PropTypes.object.isRequired,
};

