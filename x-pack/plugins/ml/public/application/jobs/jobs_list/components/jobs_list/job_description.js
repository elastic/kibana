/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { JobGroup } from '../job_group';
import { AnomalyDetectionJobIdLink } from './job_id_link';

export function JobDescription({ job, isManagementTable }) {
  return (
    <React.Fragment>
      <div className="job-description">
        {job.description} &nbsp;
        {job.groups.map((group) => {
          if (isManagementTable === true) {
            return <AnomalyDetectionJobIdLink key={group} groupId={group} />;
          }
          return <JobGroup key={group} name={group} />;
        })}
      </div>
    </React.Fragment>
  );
}
JobDescription.propTypes = {
  job: PropTypes.object.isRequired,
  isManagementTable: PropTypes.bool,
};
