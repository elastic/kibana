/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';

import {
  overviewQualityIssuesAccordionTechPreviewBadge,
  possibleMitigationTitle,
} from '../../../../../common/translations';

export function PossibleMitigationTitle() {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
      <EuiFlexItem grow={false}>
        <EuiIcon type="wrench" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <p>{possibleMitigationTitle}</p>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label={overviewQualityIssuesAccordionTechPreviewBadge}
          color="hollow"
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTechPreviewBadge"
          size="m"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
