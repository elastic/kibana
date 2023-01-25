/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const PUSH_THIRD = (thirdParty: string) => {
  if (thirdParty === 'none') {
    return i18n.translate('xpack.cases.caseView.pushThirdPartyIncident', {
      defaultMessage: 'Push as external incident',
    });
  }

  return i18n.translate('xpack.cases.caseView.pushNamedIncident', {
    values: { thirdParty },
    defaultMessage: 'Push as { thirdParty } incident',
  });
};

export const UPDATE_THIRD = (thirdParty: string) => {
  if (thirdParty === 'none') {
    return i18n.translate('xpack.cases.caseView.updateThirdPartyIncident', {
      defaultMessage: 'Update external incident',
    });
  }

  return i18n.translate('xpack.cases.caseView.updateNamedIncident', {
    values: { thirdParty },
    defaultMessage: 'Update { thirdParty } incident',
  });
};

export const PUSH_LOCKED_TITLE = (thirdParty: string) => {
  if (thirdParty === 'none') {
    return i18n.translate('xpack.cases.caseView.lockedIncidentTitleNone', {
      defaultMessage: 'External incident is up to date',
    });
  }

  return i18n.translate('xpack.cases.caseView.lockedIncidentTitle', {
    values: { thirdParty },
    defaultMessage: '{ thirdParty } incident is up to date',
  });
};

export const PUSH_LOCKED_DESC = i18n.translate('xpack.cases.caseView.lockedIncidentDesc', {
  defaultMessage: 'No update is required',
});

export const CONFIGURE_CONNECTOR = i18n.translate(
  'xpack.cases.caseView.pushToService.configureConnector',
  {
    defaultMessage: 'To create and update a case in an external system, select a connector.',
  }
);

export const PUSH_DISABLE_BY_KIBANA_CONFIG_TITLE = i18n.translate(
  'xpack.cases.caseView.pushToServiceDisableByConfigTitle',
  {
    defaultMessage: 'Enable external service in Kibana configuration file',
  }
);

export const PUSH_DISABLE_BY_LICENSE_TITLE = i18n.translate(
  'xpack.cases.caseView.pushToServiceDisableByLicenseTitle',
  {
    defaultMessage: 'Upgrade to an appropriate license',
  }
);

export const LINK_CLOUD_DEPLOYMENT = i18n.translate('xpack.cases.caseView.cloudDeploymentLink', {
  defaultMessage: 'cloud deployment',
});

export const LINK_ACTIONS_CONFIGURATION = i18n.translate(
  'xpack.cases.caseView.actionsConfigurationLink',
  {
    defaultMessage: 'Alerting and action settings in Kibana',
  }
);
