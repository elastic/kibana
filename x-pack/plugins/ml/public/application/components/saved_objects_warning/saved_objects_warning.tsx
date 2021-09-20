/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobType } from '../../../../common/types/saved_objects';
import { useMlApiContext, useMlKibana } from '../../contexts/kibana';

interface Props {
  jobType?: JobType;
}

export const SavedObjectsWarning: FC<Props> = ({ jobType }) => {
  const {
    savedObjects: { initSavedObjects },
  } = useMlApiContext();
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    let unmounted = false;
    initSavedObjects(true)
      .then(({ jobs }) => {
        if (unmounted === true) {
          return;
        }

        const missingJobs =
          jobs.length > 0 && (jobType === undefined || jobs.some(({ type }) => type === jobType));
        setShowWarning(missingJobs);
      })
      .catch(() => {
        console.log('Saved object synchronization check could not be performed.'); // eslint-disable-line no-console
      });
    return () => {
      unmounted = true;
    };
  }, []);

  return showWarning === false ? null : (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsList.missingSavedObjectWarning.title"
            defaultMessage="ML job synchronization required"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="mlJobSyncRequiredWarning"
      >
        <div>
          <FormattedMessage
            id="xpack.ml.jobsList.missingSavedObjectWarning.description"
            defaultMessage="Some jobs are missing their saved object and require synchronization in {link}."
            values={{
              link: (
                <EuiLink href={`${basePath.get()}/app/management/insightsAndAlerting/jobsListLink`}>
                  <FormattedMessage
                    id="xpack.ml.jobsList.missingSavedObjectWarning.linkToManagement.link"
                    defaultMessage="Stack Management"
                  />
                </EuiLink>
              ),
            }}
          />
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
