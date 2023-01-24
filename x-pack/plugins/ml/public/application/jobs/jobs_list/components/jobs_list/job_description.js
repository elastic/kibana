/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { JobGroup } from '../job_group';

export function JobDescription({ job }) {
  return (
    <React.Fragment>
      <div className="job-description">
        {job.description} &nbsp;
        {job.groups.map((group) => (
          <JobGroup key={group} name={group} />
        ))}
      </div>
    </React.Fragment>
  );
}
JobDescription.propTypes = {
  job: PropTypes.object.isRequired,
};
