/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIconTip, EuiSpacer } from '@elastic/eui';
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

export const EsStatsErrors: React.FunctionComponent<Props> = ({ error }) => {
  let iconContent: React.ReactNode;

  if (error.statusCode === 403) {
    iconContent = (
      <EuiIconTip type="alert" color="danger" size="l" content={i18nTexts.permissionsError} />
    );
  } else if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === false) {
    iconContent = (
      <EuiIconTip
        type="alert"
        color="warning"
        size="l"
        content={i18nTexts.partiallyUpgradedWarning}
      />
    );
  } else if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === true) {
    iconContent = (
      <EuiIconTip
        type="checkInCircleFilled"
        color="success"
        size="l"
        content={i18nTexts.upgradedMessage}
      />
    );
  } else {
    iconContent = (
      <EuiIconTip type="alert" color="danger" size="l" content={i18nTexts.loadingError} />
    );
  }

  return (
    <>
      <EuiSpacer size="s" />
      {iconContent}
    </>
  );
};
