/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { PhaseWithAllocation } from '../../../../../../common/types';
import { useKibana } from '../../../../../shared_imports';

const deployment = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.body.elasticDeploymentLink',
  {
    defaultMessage: 'deployment',
  }
);

const i18nTexts = {
  warm: {
    title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.title', {
      defaultMessage: 'Create a warm tier',
    }),
    body: (deploymentUrl?: string) => {
      return (
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.body"
          defaultMessage="No warm nodes are available. Edit your Elastic {deployment} to set up a warm tier."
          values={{
            deployment: deploymentUrl ? (
              <EuiLink external href={deploymentUrl} target="_blank">
                {deployment}
              </EuiLink>
            ) : (
              deployment
            ),
          }}
        />
      );
    },
  },
  cold: {
    title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.title', {
      defaultMessage: 'Create a cold tier',
    }),
    body: (deploymentUrl?: string) => {
      return (
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.body"
          defaultMessage="No cold nodes are available. Edit your Elastic {deployment} to set up a cold tier."
          values={{
            deployment: deploymentUrl ? (
              <EuiLink external href={deploymentUrl} target="_blank">
                {deployment}
              </EuiLink>
            ) : (
              deployment
            ),
          }}
        />
      );
    },
  },
};

interface Props {
  phase: PhaseWithAllocation;
}

export const CloudDataTierCallout: FunctionComponent<Props> = ({ phase }) => {
  const {
    services: { cloud },
  } = useKibana();

  return (
    <EuiCallOut title={i18nTexts[phase].title} data-test-subj="cloudDataTierCallout">
      {i18nTexts[phase].body(cloud?.cloudDeploymentUrl)}
    </EuiCallOut>
  );
};
