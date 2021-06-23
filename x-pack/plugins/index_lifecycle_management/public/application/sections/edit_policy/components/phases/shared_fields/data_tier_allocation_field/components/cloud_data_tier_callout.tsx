/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.title', {
    defaultMessage: 'Migrate to data tiers',
  }),
  body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.body', {
    defaultMessage: 'Migrate your Elastic Cloud deployment to use data tiers.',
  }),
  linkText: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.linkToCloudDeploymentDescription',
    { defaultMessage: 'View cloud deployment' }
  ),
};

interface Props {
  linkToCloudDeployment?: string;
}

/**
 * A call-to-action for users to migrate to data tiers if their cluster is still running
 * the deprecated node.data:true config.
 */
export const CloudDataTierCallout: FunctionComponent<Props> = ({ linkToCloudDeployment }) => {
  return (
    <EuiCallOut title={i18nTexts.title} data-test-subj="cloudDataTierCallout">
      {i18nTexts.body}{' '}
      {Boolean(linkToCloudDeployment) && (
        <EuiLink href={linkToCloudDeployment} external>
          {i18nTexts.linkText}
        </EuiLink>
      )}
    </EuiCallOut>
  );
};
