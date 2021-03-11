/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

const geti18nTexts = (tier: 'cold' | 'frozen') => ({
  title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudMissingTierCallout.title', {
    defaultMessage: 'Create a {tier} tier',
    values: { tier },
  }),
  body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudMissingTierCallout.body', {
    defaultMessage: 'Edit your Elastic Cloud deployment to set up a {tier} tier.',
    values: { tier },
  }),
  linkText: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.cloudMissingTierCallout.linkToCloudDeploymentDescription',
    { defaultMessage: 'View cloud deployment' }
  ),
});

interface Props {
  phase: 'cold' | 'frozen';
  linkToCloudDeployment?: string;
}

/**
 * A call-to-action for users to activate their cold tier slider to provision cold tier nodes.
 * This may need to be change when we have autoscaling enabled on a cluster because nodes may not
 * yet exist, but will automatically be provisioned.
 */
export const MissingCloudTierCallout: FunctionComponent<Props> = ({
  phase,
  linkToCloudDeployment,
}) => {
  const i18nTexts = geti18nTexts(phase);

  return (
    <EuiCallOut title={i18nTexts.title} data-test-subj="cloudMissingTierCallout">
      {i18nTexts.body}{' '}
      {Boolean(linkToCloudDeployment) && (
        <EuiLink href={linkToCloudDeployment} external>
          {i18nTexts.linkText}
        </EuiLink>
      )}
    </EuiCallOut>
  );
};
