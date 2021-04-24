/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PhaseWithAllocation } from '../../../../../../../../../common/types';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.defaultToDataNodesLabel', {
    defaultMessage: 'Store data on any available data node',
  }),
  body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.defaultToDataNodesDescription', {
    defaultMessage:
      'To allocate data to particular data nodes, use role-based allocation or configure custom node attributes in elasticsearch.yml.',
  }),
};

export const DefaultToDataNodesNotice: FunctionComponent<{ phase: PhaseWithAllocation }> = ({
  phase,
}) => {
  return (
    <EuiCallOut
      data-test-subj="defaultToDataNodesNotice"
      style={{ maxWidth: 400 }}
      title={i18nTexts.title}
      color="primary"
    >
      {i18nTexts.body}
    </EuiCallOut>
  );
};
