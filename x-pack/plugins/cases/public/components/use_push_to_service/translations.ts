/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_PUSH_SERVICE_CALLOUT_TITLE = i18n.translate(
  'xpack.cases.caseView.errorsPushServiceCallOutTitle',
  {
    defaultMessage: 'To send cases to external systems, you need to:',
  }
);
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

export const PUSH_DISABLE_BY_NO_CONFIG_TITLE = i18n.translate(
  'xpack.cases.caseView.pushToServiceDisableByNoConfigTitle',
  {
    defaultMessage: 'Configure external connector',
  }
);

export const PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE = i18n.translate(
  'xpack.cases.caseView.pushToServiceDisableByNoCaseConfigTitle',
  {
    defaultMessage: 'Select external connector',
  }
);

export const PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE = i18n.translate(
  'xpack.cases.caseView.pushToServiceDisableBecauseCaseClosedTitle',
  {
    defaultMessage: 'Reopen the case',
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

export const LINK_APPROPRIATE_LICENSE = i18n.translate('xpack.cases.caseView.appropiateLicense', {
  defaultMessage: 'appropriate license',
});

export const LINK_CONNECTOR_CONFIGURE = i18n.translate(
  'xpack.cases.caseView.connectorConfigureLink',
  {
    defaultMessage: 'connector',
  }
);
