/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function SloGroupListError() {
  return (
    <EuiEmptyPrompt
      data-test-subj="sloGroupListError"
      iconType="warning"
      color="danger"
      title={
        <h2>
          {i18n.translate('xpack.slo.groupList.errorTitle', {
            defaultMessage: 'Unable to load SLO groups',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.slo.groupList.errorMessage', {
            defaultMessage:
              'There was an error loading the SLO groups. Contact your administrator for help.',
          })}
        </p>
      }
    />
  );
}
