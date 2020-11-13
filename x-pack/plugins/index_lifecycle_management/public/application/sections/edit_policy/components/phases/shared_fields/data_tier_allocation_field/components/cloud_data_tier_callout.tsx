/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.title', {
    defaultMessage: 'Create a cold tier',
  }),
  body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.body', {
    defaultMessage: 'Edit your Elastic Cloud deployment to set up a cold tier.',
  }),
};

export const CloudDataTierCallout: FunctionComponent = () => {
  return (
    <EuiCallOut title={i18nTexts.title} data-test-subj="cloudDataTierCallout">
      {i18nTexts.body}
    </EuiCallOut>
  );
};
