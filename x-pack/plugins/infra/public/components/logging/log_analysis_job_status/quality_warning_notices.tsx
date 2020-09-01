/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiSpacer, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import groupBy from 'lodash/groupBy';
import React, { useState } from 'react';
import { euiStyled } from '../../../../../observability/public';
import {
  CategoryQualityWarning,
  CategoryQualityWarningReason,
  getFriendlyNameForPartitionId,
} from '../../../../common/log_analysis';
import { RecreateJobCallout } from './recreate_job_callout';

export const CategoryQualityWarnings: React.FC<{
  hasSetupCapabilities: boolean;
  onRecreateMlJob: () => void;
  qualityWarnings: CategoryQualityWarning[];
}> = ({ hasSetupCapabilities, onRecreateMlJob, qualityWarnings }) => {
  const [detailAccordionId] = useState(htmlIdGenerator()());

  const categoryQualityWarningsByJob = groupBy(qualityWarnings, 'jobId');

  return (
    <>
      {Object.entries(categoryQualityWarningsByJob).map(([jobId, qualityWarningsForJob]) => (
        <RecreateJobCallout
          hasSetupCapabilities={hasSetupCapabilities}
          key={`quality-warnings-callout-${jobId}`}
          onRecreateMlJob={onRecreateMlJob}
          title={categoryQualityWarningCalloutTitle}
        >
          <FormattedMessage
            id="xpack.infra.logs.logEntryCategories.categoryQualityWarningCalloutMessage"
            defaultMessage="While analyzing the log messages we've detected some problems which might indicate a reduced quality of the categorization results. Consider excluding the respective datasets from the analysis."
            tagName="p"
          />
          <EuiAccordion
            id={detailAccordionId}
            buttonContent={
              <FormattedMessage
                id="xpack.infra-logs.logEntryCategories.categoryQualityWarningDetailsAccordionButtonLabel"
                defaultMessage="Details"
              />
            }
            paddingSize="s"
          >
            <ul>
              {qualityWarningsForJob.flatMap((qualityWarning) =>
                qualityWarning.reasons.map((reason) => (
                  <li key={`title-${reason.type}-${qualityWarning.dataset}`}>
                    <WarningReasonListTitle
                      data-test-subj={`description-${reason.type}-${qualityWarning.dataset}`}
                    >
                      {getFriendlyNameForPartitionId(qualityWarning.dataset)}
                    </WarningReasonListTitle>
                    <WarningReasonListDescription
                      data-test-subj={`description-${reason.type}-${qualityWarning.dataset}`}
                    >
                      <CategoryQualityWarningReasonDescription reason={reason} />
                    </WarningReasonListDescription>
                  </li>
                ))
              )}
            </ul>
          </EuiAccordion>
          <EuiSpacer size="l" />
        </RecreateJobCallout>
      ))}
    </>
  );
};

const WarningReasonListTitle = euiStyled.div`
  display: inline-block;
  font-weight: bold;
  padding-right: ${(props) => props.theme.eui.paddingSizes.m}
`;

const WarningReasonListDescription = euiStyled.div`
  display: inline-block;
`;

const categoryQualityWarningCalloutTitle = i18n.translate(
  'xpack.infra.logs.logEntryCategories.categoryQUalityWarningCalloutTitle',
  {
    defaultMessage: 'Quality warning',
  }
);

export const CategoryQualityWarningReasonDescription: React.FC<{
  reason: CategoryQualityWarningReason;
}> = ({ reason }) => {
  switch (reason.type) {
    case 'singleCategory':
      return (
        <FormattedMessage
          id="xpack.infra.logs.logEntryCategories.singleCategoryWarningReasonDescription"
          defaultMessage="The analysis couldn't extract more than a single category from the log messages."
        />
      );
    case 'manyRareCategories':
      return (
        <FormattedMessage
          id="xpack.infra.logs.logEntryCategories.manyRareCategoriesWarningReasonDescription"
          defaultMessage="{rareCategoriesRatio, number, percent} of the categories only rarely have messages assigned to them."
          values={{
            rareCategoriesRatio: reason.rareCategoriesRatio,
          }}
        />
      );
    case 'manyCategories':
      return (
        <FormattedMessage
          id="xpack.infra.logs.logEntryCategories.manyCategoriesWarningReasonDescription"
          defaultMessage="The ratio of categories per analyzed document is very high with {categoriesDocumentRatio, number }."
          values={{
            categoriesDocumentRatio: reason.categoriesDocumentRatio.toFixed(2),
          }}
        />
      );
    case 'noFrequentCategories':
      return (
        <FormattedMessage
          id="xpack.infra.logs.logEntryCategories.noFrequentCategoryWarningReasonDescription"
          defaultMessage="None of the extracted categories frequently have messages assigned to them."
        />
      );
    case 'manyDeadCategories':
      return (
        <FormattedMessage
          id="xpack.infra.logs.logEntryCategories.manyDeadCategoriesWarningReasonDescription"
          defaultMessage="{deadCategoriesRatio, number, percent} of the categories won't have new messages assigned to them because they are overshadowed by less specific categories."
          values={{
            deadCategoriesRatio: reason.deadCategoriesRatio,
          }}
        />
      );
  }
};
