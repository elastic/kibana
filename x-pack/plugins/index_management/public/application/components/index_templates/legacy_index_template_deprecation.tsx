/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiButton } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';
import { reactRouterNavigate } from '../../../shared_imports';

interface Props {
  history?: ScopedHistory;
  showCta?: boolean;
}

export const LegacyIndexTemplatesDeprecation: React.FunctionComponent<Props> = ({
  history,
  showCta,
}) => (
  <EuiCallOut
    title={i18n.translate('xpack.idxMgmt.legacyIndexTemplatesDeprecation.title', {
      defaultMessage: 'Legacy index templates are deprecated in favor of composable templates',
    })}
    color="warning"
    iconType="alert"
    data-test-subj="legacyIndexTemplateDeprecationWarning"
  >
    {showCta && history && (
      <EuiButton
        iconType="plusInCircle"
        data-test-subj="createTemplateButton"
        key="createTemplateButton"
        color="warning"
        fill
        {...reactRouterNavigate(history, '/create_template')}
      >
        <FormattedMessage
          id="xpack.idxMgmt.legacyIndexTemplatesDeprecation.createTemplatesButtonLabel"
          defaultMessage="Create composable template"
        />
      </EuiButton>
    )}
  </EuiCallOut>
);
