/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';

import { TemplateType } from '../../../../../../common';

interface Props {
  templateType: TemplateType;
}

const i18nTexts = {
  managed: i18n.translate('xpack.idxMgmt.templateBadgeType.managed', {
    defaultMessage: 'Managed',
  }),
  cloudManaged: i18n.translate('xpack.idxMgmt.templateBadgeType.cloudManaged', {
    defaultMessage: 'Cloud-managed',
  }),
  system: i18n.translate('xpack.idxMgmt.templateBadgeType.system', { defaultMessage: 'System' }),
};

export const TemplateTypeIndicator = ({ templateType }: Props) => {
  if (templateType === 'default') {
    return null;
  }

  return (
    <EuiBadge color="hollow" data-test-subj="templateTypeBadge">
      {i18nTexts[templateType]}
    </EuiBadge>
  );
};
