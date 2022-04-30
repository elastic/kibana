/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const URGENCY = i18n.translate('xpack.cases.connectors.serviceNow.urgencySelectFieldLabel', {
  defaultMessage: 'Urgency',
});

export const SEVERITY = i18n.translate(
  'xpack.cases.connectors.serviceNow.severitySelectFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const IMPACT = i18n.translate('xpack.cases.connectors.serviceNow.impactSelectFieldLabel', {
  defaultMessage: 'Impact',
});

export const CHOICES_API_ERROR = i18n.translate(
  'xpack.cases.connectors.serviceNow.unableToGetChoicesMessage',
  {
    defaultMessage: 'Unable to get choices',
  }
);

export const MALWARE_URL = i18n.translate('xpack.cases.connectors.serviceNow.malwareURLTitle', {
  defaultMessage: 'Malware URLs',
});

export const MALWARE_HASH = i18n.translate('xpack.cases.connectors.serviceNow.malwareHashTitle', {
  defaultMessage: 'Malware Hashes',
});

export const CATEGORY = i18n.translate('xpack.cases.connectors.serviceNow.categoryTitle', {
  defaultMessage: 'Category',
});

export const SUBCATEGORY = i18n.translate('xpack.cases.connectors.serviceNow.subcategoryTitle', {
  defaultMessage: 'Subcategory',
});

export const SOURCE_IP = i18n.translate('xpack.cases.connectors.serviceNow.sourceIPTitle', {
  defaultMessage: 'Source IPs',
});

export const DEST_IP = i18n.translate('xpack.cases.connectors.serviceNow.destinationIPTitle', {
  defaultMessage: 'Destination IPs',
});

export const PRIORITY = i18n.translate(
  'xpack.cases.connectors.serviceNow.prioritySelectFieldTitle',
  {
    defaultMessage: 'Priority',
  }
);

export const ALERT_FIELDS_LABEL = i18n.translate(
  'xpack.cases.connectors.serviceNow.alertFieldsTitle',
  {
    defaultMessage: 'Select Observables to push',
  }
);

export const ALERT_FIELD_ENABLED_TEXT = i18n.translate(
  'xpack.cases.connectors.serviceNow.alertFieldEnabledText',
  {
    defaultMessage: 'Yes',
  }
);
