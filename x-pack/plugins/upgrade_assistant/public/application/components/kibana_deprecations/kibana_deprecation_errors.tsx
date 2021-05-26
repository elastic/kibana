/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

interface Props {
  errorType: 'pluginError' | 'requestError';
}

const i18nTexts = {
  pluginError: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationErrors.pluginErrorMessage', {
    defaultMessage:
      'Not all Kibana deprecations were retrieved successfully. This list may be incomplete. Check the Kibana server logs for errors.',
  }),
  loadingError: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationErrors.loadingErrorMessage',
    {
      defaultMessage:
        'Could not retrieve Kibana deprecations. Check the Kibana server logs for errors.',
    }
  ),
};

export const KibanaDeprecationErrors: React.FunctionComponent<Props> = ({ errorType }) => {
  if (errorType === 'pluginError') {
    return (
      <EuiCallOut
        title={i18nTexts.pluginError}
        color="warning"
        iconType="alert"
        data-test-subj="kibanaPluginError"
      />
    );
  }

  return (
    <EuiCallOut
      title={i18nTexts.loadingError}
      color="danger"
      iconType="alert"
      data-test-subj="kibanaRequestError"
    />
  );
};
