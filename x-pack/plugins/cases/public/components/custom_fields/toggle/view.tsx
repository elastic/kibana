/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIcon } from '@elastic/eui';
import type { CaseCustomFieldToggle } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';

const ViewComponent: CustomFieldType<CaseCustomFieldToggle>['View'] = ({ customField }) => {
  const value = Boolean(customField?.value);
  const iconType = value ? 'check' : 'empty';

  return (
    <EuiIcon data-test-subj={`toggle-custom-field-view-${customField?.key}`} type={iconType}>
      {value}
    </EuiIcon>
  );
};

ViewComponent.displayName = 'View';

export const View = React.memo(ViewComponent);
