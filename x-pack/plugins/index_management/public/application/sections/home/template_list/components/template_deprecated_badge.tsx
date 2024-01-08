/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiBadge } from '@elastic/eui';

export const TemplateDeprecatedBadge = () => {
  return (
    <EuiToolTip
      content={i18n.translate('xpack.idxMgmt.templateList.table.deprecatedTemplateBadgeTooltip', {
        defaultMessage: 'This index template is deprecated and should not be relied on.',
      })}
    >
      <EuiBadge color="warning" data-test-subj="deprecatedTemplateBadge">
        {i18n.translate('xpack.idxMgmt.templateList.table.deprecatedTemplateBadgeText', {
          defaultMessage: 'Deprecated',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};
