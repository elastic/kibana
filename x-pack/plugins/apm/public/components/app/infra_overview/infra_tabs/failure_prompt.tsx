/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiPageTemplate_Deprecated as EuiPageTemplate,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function FailurePrompt() {
  return (
    <EuiPageTemplate
      pageContentProps={{
        color: 'transparent',
      }}
      template="centeredBody"
    >
      <EuiEmptyPrompt
        color="danger"
        iconType="alert"
        layout="vertical"
        title={
          <h2>
            {i18n.translate('xpack.apm.infraTabs.failurePromptTitle', {
              defaultMessage: 'Unable to load your infrastructure data',
            })}
          </h2>
        }
        titleSize="m"
        body={
          <p>
            {i18n.translate('xpack.apm.infraTabs.failurePromptDescription', {
              defaultMessage:
                'There was a problem loading the Infrastructure tab and your data. You can contact your administrator for help.',
            })}
          </p>
        }
      />
    </EuiPageTemplate>
  );
}
