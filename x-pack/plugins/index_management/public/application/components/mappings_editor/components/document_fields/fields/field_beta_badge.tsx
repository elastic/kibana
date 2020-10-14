/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const FieldBetaBadge = () => {
  const betaText = i18n.translate('xpack.idxMgmt.mappingsEditor.fieldBetaBadgeLabel', {
    defaultMessage: 'Beta',
  });

  const tooltipText = i18n.translate('xpack.idxMgmt.mappingsEditor.fieldBetaBadgeTooltip', {
    defaultMessage: 'This field type is not GA. Please help us by reporting any bugs.',
  });

  return <EuiBetaBadge label={betaText} tooltipContent={tooltipText} />;
};
