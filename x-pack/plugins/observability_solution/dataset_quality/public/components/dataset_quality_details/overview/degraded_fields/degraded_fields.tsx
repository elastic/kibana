/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiTitle,
  EuiIconTip,
  EuiAccordion,
  useGeneratedHtmlId,
  EuiBadge,
  EuiBetaBadge,
} from '@elastic/eui';
import {
  overviewDegradedFieldsSectionTitle,
  overviewDegradedFieldsSectionTitleTooltip,
  overviewQualityIssuesAccordionTechPreviewBadge,
} from '../../../../../common/translations';
import { DegradedFieldTable } from './table';
import { useDegradedFields } from '../../../../hooks';

export function DegradedFields() {
  const accordionId = useGeneratedHtmlId({
    prefix: overviewDegradedFieldsSectionTitle,
  });

  const { totalItemCount } = useDegradedFields();

  const accordionTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
      <EuiTitle size="xxs">
        <h6>{overviewDegradedFieldsSectionTitle}</h6>
      </EuiTitle>
      <EuiIconTip content={overviewDegradedFieldsSectionTitleTooltip} color="subdued" size="m" />
      <EuiBadge
        color="default"
        data-test-subj="datasetQualityDetailsOverviewDegradedFieldTitleCount"
      >
        {totalItemCount}
      </EuiBadge>
      <EuiBetaBadge
        label={overviewQualityIssuesAccordionTechPreviewBadge}
        color="hollow"
        data-test-subj="datasetQualityDetailsOverviewDegradedFieldsTechPreview"
        size="s"
      />
    </EuiFlexGroup>
  );
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="none"
        initialIsOpen={true}
        data-test-subj="datasetQualityDetailsOverviewDocumentTrends"
      >
        <DegradedFieldTable />
      </EuiAccordion>
    </EuiPanel>
  );
}
