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

import './styles/main.less';

export function DetectorDescriptionList({
  job,
  detector }) {

  const listItems = [
    {
      title: 'job ID',
      description: job.job_id,
    },
    {
      title: 'detector',
      description: detector.detector_description,
    }
  ];

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
};

