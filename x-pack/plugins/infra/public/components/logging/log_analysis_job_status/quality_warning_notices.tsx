/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiSpacer,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { groupBy } from 'lodash';
import React, { Fragment, useState } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
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
                id="xpack.infra.logs.logEntryCategories.categoryQualityWarningDetailsAccordionButtonLabel"
                defaultMessage="Details"
              />
            }
            paddingSize="m"
          >
            <EuiDescriptionList>
              {qualityWarningsForJob.flatMap((qualityWarning) => (
                <Fragment key={`item-${getFriendlyNameForPartitionId(qualityWarning.dataset)}`}>
                  <EuiDescriptionListTitle data-test-subj={`title-${qualityWarning.dataset}`}>
                    {getFriendlyNameForPartitionId(qualityWarning.dataset)}
                  </EuiDescriptionListTitle>
                  {qualityWarning.reasons.map((reason) => (
                    <QualityWarningReasonDescription
                      key={`description-${reason.type}-${qualityWarning.dataset}`}
                      data-test-subj={`description-${reason.type}-${qualityWarning.dataset}`}
                    >
                      <CategoryQualityWarningReasonDescription reason={reason} />
                    </QualityWarningReasonDescription>
                  ))}
                </Fragment>
              ))}
            </EuiDescriptionList>
          </EuiAccordion>
          <EuiSpacer size="l" />
        </RecreateJobCallout>
      ))}
    </>
  );
};

const QualityWarningReasonDescription = euiStyled(EuiDescriptionListDescription)`
  display: list-item;
  list-style-type: disc;
  margin-left: ${(props) => props.theme.eui.paddingSizes.m};
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
