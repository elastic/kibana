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
  title: {
    warm: i18n.translate(
      'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableTitle',
      { defaultMessage: 'Indices will be allocated to the warm tier' }
    ),
    cold: i18n.translate(
      'xpack.indexLifecycleMgmt.coldPhase.dataTier.defaultAllocationNotAvailableTitle',
      { defaultMessage: 'Indices will be allocated to the cold tier' }
    ),
  },
  body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.defaultToDataTiersDescription', {
    defaultMessage:
      'To control allocation with custom node attributes instead of the built-in node roles, configure node attributes in elasticsearch.yml.',
  }),
};

export const DefaultToDataTiersNotice: FunctionComponent<{ phase: PhaseWithAllocation }> = ({
  phase,
}) => {
  return (
    <EuiCallOut
      data-test-subj="defaultToDataTiersNotice"
      style={{ maxWidth: 400 }}
      title={i18nTexts.title[phase]}
      color="primary"
    >
      {i18nTexts.body}
    </EuiCallOut>
  );
};
