/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PhaseWithAllocation } from '../../../../../../../../../common/types';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingLabel', {
    defaultMessage: 'No custom node attributes configured',
  }),
  warm: {
    body: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.warm.nodeAttributesMissingDescription',
      {
        defaultMessage:
          'Define custom node attributes in elasticsearch.yml to use attribute-based allocation.',
      }
    ),
  },
  cold: {
    body: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.cold.nodeAttributesMissingDescription',
      {
        defaultMessage:
          'Define custom node attributes in elasticsearch.yml to use attribute-based allocation.',
      }
    ),
  },
};

export const NoNodeAttributesWarning: FunctionComponent<{ phase: PhaseWithAllocation }> = ({
  phase,
}) => {
  return (
    <EuiCallOut
      data-test-subj="noNodeAttributesWarning"
      style={{ maxWidth: 400 }}
      title={i18nTexts.title}
      color="warning"
    >
      {i18nTexts[phase].body}
    </EuiCallOut>
  );
};
