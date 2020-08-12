/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { JobGroup } from '../job_group';
import { getGroupIdsUrl, TAB_IDS } from '../../../../util/get_selected_ids_url';

export function JobDescription({ job, isManagementTable }) {
  return (
    <React.Fragment>
      <div className="job-description">
        {job.description} &nbsp;
        {job.groups.map((group) => {
          if (isManagementTable === true) {
            return (
              <a key={group} href={getGroupIdsUrl(TAB_IDS.ANOMALY_DETECTION, [group])}>
                <JobGroup name={group} />
              </a>
            );
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
