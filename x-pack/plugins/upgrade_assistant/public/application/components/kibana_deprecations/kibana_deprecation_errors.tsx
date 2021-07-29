/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPageContent, EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  errorType: 'pluginError' | 'requestError';
}

const i18nTexts = {
  pluginError: {
    title: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationErrors.pluginErrorTitle', {
      defaultMessage: 'Not all Kibana deprecations were retrieved successfully',
    }),
    description: i18n.translate(
      'xpack.upgradeAssistant.kibanaDeprecationErrors.pluginErrorDescription',
      {
        defaultMessage: 'Check the Kibana server logs for errors.',
      }
    ),
  },
  loadingError: {
    title: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationErrors.loadingErrorTitle', {
      defaultMessage: 'Could not retrieve Kibana deprecations',
    }),
    description: i18n.translate(
      'xpack.upgradeAssistant.kibanaDeprecationErrors.loadingErrorDescription',
      {
        defaultMessage: 'Check the Kibana server logs for errors.',
      }
    ),
  },
};

export const KibanaDeprecationErrors: React.FunctionComponent<Props> = ({ errorType }) => {
  if (errorType === 'pluginError') {
    return (
      <EuiPageContent
        verticalPosition="center"
        horizontalPosition="center"
        color="danger"
        data-test-subj="kibanaPluginError"
      >
        <EuiEmptyPrompt
          iconType="alert"
          title={<h2>{i18nTexts.pluginError.title}</h2>}
          body={<p>{i18nTexts.pluginError.description}</p>}
        />
      </EuiPageContent>
    );
  }

  return (
    <EuiPageContent
      verticalPosition="center"
      horizontalPosition="center"
      color="danger"
      data-test-subj="kibanaRequestError"
    >
      <EuiEmptyPrompt
        iconType="alert"
        title={<h2>{i18nTexts.loadingError.title}</h2>}
        body={<p>{i18nTexts.loadingError.description}</p>}
      />
    </EuiPageContent>
  );
};
