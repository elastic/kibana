/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC } from 'react';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { mlNodesAvailable, permissionToViewMlNodeCount } from '../../ml_nodes_check';
import { getCloudDeploymentId, isCloud } from '../../services/ml_server_info';

export const NodeAvailableWarning: FC = () => {
  if (mlNodesAvailable() === true || permissionToViewMlNodeCount() === false) {
    return null;
  }

  const id = getCloudDeploymentId();
  return (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsList.nodeAvailableWarning.noMLNodesAvailableTitle"
            defaultMessage="No ML nodes available"
          />
        }
        color="warning"
        iconType="alert"
      >
        <div>
          <FormattedMessage
            id="xpack.ml.jobsList.nodeAvailableWarning.noMLNodesAvailableDescription"
            defaultMessage="There are no ML nodes available."
          />
        </div>
        <div>
          <FormattedMessage
            id="xpack.ml.jobsList.nodeAvailableWarning.unavailableCreateOrRunJobsDescription"
            defaultMessage="You will not be able to create or run jobs."
          />
        </div>
        {isCloud() && id !== null && (
          <div>
            <FormattedMessage
              id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloudDescription"
              defaultMessage="Please edit your {link}. You may enable a free 1GB machine learning node or expand your existing ML configuration."
              values={{
                link: (
                  <EuiLink href={`https://cloud.elastic.co/deployments?q=${id}`}>
                    <FormattedMessage
                      id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloud.hereLinkText"
                      defaultMessage="Elastic Cloud deployment"
                    />
                  </EuiLink>
                ),
              }}
            />
          </div>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
};
