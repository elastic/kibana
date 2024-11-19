/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { EuiCallOutProps } from '@elastic/eui';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  TRIAL_MAX_RAM_FOR_ML_NODES,
  PLATINUM_MAX_RAM_FOR_ML_NODES,
} from '../../../../common/constants/cloud';

interface Props {
  size?: EuiCallOutProps['size'];
  isCloud: boolean;
  isCloudTrial: boolean;
  deploymentId: string | null;
}

export const Warning: FC<Props> = ({ size, isCloud, isCloudTrial, deploymentId }) => {
  return (
    <>
      <EuiCallOut
        size={size}
        title={
          <FormattedMessage
            id="xpack.ml.jobsList.nodeAvailableWarning.noMLNodesAvailableTitle"
            defaultMessage="No ML nodes available"
          />
        }
        color="warning"
        iconType="warning"
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
        {isCloud && deploymentId !== null && (
          <div>
            <FormattedMessage
              id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloudDescription"
              defaultMessage="Please edit your {link}. You may enable a free {maxRamForMLNodes} machine learning node or expand your existing ML configuration."
              values={{
                link: (
                  <EuiLink href={`https://cloud.elastic.co/deployments?q=${deploymentId}`}>
                    <FormattedMessage
                      id="xpack.ml.jobsList.nodeAvailableWarning.linkToCloud.hereLinkText"
                      defaultMessage="Elastic Cloud deployment"
                    />
                  </EuiLink>
                ),
                maxRamForMLNodes: isCloudTrial
                  ? TRIAL_MAX_RAM_FOR_ML_NODES
                  : PLATINUM_MAX_RAM_FOR_ML_NODES,
              }}
            />
          </div>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
