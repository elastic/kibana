/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ResponseError } from '../../../common/types';

const i18nTexts = {
  permissionsError: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationErrors.permissionsErrorMessage',
    {
      defaultMessage: 'You are not authorized to view Elasticsearch deprecation issues.',
    }
  ),
  partiallyUpgradedWarning: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationErrors.partiallyUpgradedWarningMessage',
    {
      defaultMessage:
        'Upgrade Kibana to the same version as your Elasticsearch cluster. One or more nodes in the cluster is running a different version than Kibana.',
    }
  ),
  upgradedMessage: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationErrors.upgradedWarningMessage',
    {
      defaultMessage: 'All Elasticsearch nodes have been upgraded.',
    }
  ),
  loadingError: i18n.translate('xpack.upgradeAssistant.esDeprecationErrors.loadingErrorMessage', {
    defaultMessage: 'Could not retrieve Elasticsearch deprecation issues.',
  }),
};

export const getEsDeprecationError = (error: ResponseError) => {
  if (error.statusCode === 403) {
    return {
      code: 'unauthorized_error',
      message: i18nTexts.permissionsError,
    };
  } else if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === false) {
    return {
      code: 'partially_upgraded_error',
      message: i18nTexts.partiallyUpgradedWarning,
    };
  } else if (error?.statusCode === 426 && error.attributes?.allNodesUpgraded === true) {
    return {
      code: 'upgraded_error',
      message: i18nTexts.upgradedMessage,
    };
  } else {
    return {
      code: 'request_error',
      message: i18nTexts.loadingError,
    };
  }
};
