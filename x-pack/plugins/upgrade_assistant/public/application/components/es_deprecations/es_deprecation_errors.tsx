/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ResponseError } from '../../lib/api';

const i18nTexts = {
  permissionsError: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.errors.permissionsErrorMessage',
    {
      defaultMessage: 'You do not have sufficient privileges to view Elasticsearch deprecations.',
    }
  ),
  partiallyUpgradedWarning: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.errors.partiallyUpgradedWarningMessage',
    {
      defaultMessage:
        'One or more Elasticsearch nodes have a newer version of Elasticsearch than Kibana.',
    }
  ),
  upgradedMessage: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.errors.partiallyUpgradedWarningMessage',
    {
      defaultMessage: 'All Elasticsearch nodes have been upgraded.',
    }
  ),
  loadingError: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.errors.loadingErrorMessage',
    {
      defaultMessage: 'An error occurred while retrieving Elasticsearch deprecations.',
    }
  ),
};

interface Props {
  error: ResponseError;
}

export const EsDeprecationErrors: React.FunctionComponent<Props> = ({ error }) => {
  if (error.statusCode === 403) {
    return (
      <EuiCallOut
        title={i18nTexts.permissionsError}
        color="danger"
        iconType="alert"
        data-test-subj="permissionsError"
      />
    );
  }

  if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === false) {
    return (
      <EuiCallOut
        title={i18nTexts.partiallyUpgradedWarning}
        color="warning"
        iconType="alert"
        data-test-subj="partiallyUpgradedWarning"
      />
    );
  }

  if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === true) {
    return (
      <EuiCallOut
        title={i18nTexts.upgradedMessage}
        iconType="pin"
        data-test-subj="upgradedCallout"
      />
    );
  }

  return (
    <EuiCallOut
      title={i18nTexts.loadingError}
      color="danger"
      iconType="alert"
      data-test-subj="loadingError"
    >
      {error.message}
    </EuiCallOut>
  );
};
