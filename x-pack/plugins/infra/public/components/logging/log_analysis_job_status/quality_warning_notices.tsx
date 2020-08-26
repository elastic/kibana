/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useState } from 'react';
import type {
  CategoryQualityWarningReason,
  QualityWarning,
} from '../../../containers/logs/log_analysis/log_analysis_module_types';
import { RecreateJobCallout } from './recreate_job_callout';

export const CategoryQualityWarnings: React.FC<{
  hasSetupCapabilities: boolean;
  onRecreateMlJob: () => void;
  qualityWarnings: QualityWarning[];
}> = ({ hasSetupCapabilities, onRecreateMlJob, qualityWarnings }) => {
  const [detailAccordionId] = useState(htmlIdGenerator()());

  return (
    <>
      {qualityWarnings.map((qualityWarning, qualityWarningIndex) => (
        <RecreateJobCallout
          hasSetupCapabilities={hasSetupCapabilities}
          key={`${qualityWarningIndex}`}
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
            <EuiDescriptionList compressed>
              {qualityWarning.reasons.map((reason) => (
                <Fragment key={`title-${reason.type}-${qualityWarning.dataset}`}>
                  <EuiDescriptionListTitle
                    data-test-subj={`description-${reason.type}-${qualityWarning.dataset}`}
                  >
                    {qualityWarning.dataset}
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription
                    data-test-subj={`description-${reason.type}-${qualityWarning.dataset}`}
                  >
                    <CategoryQualityWarningReasonDescription
                      dataset={qualityWarning.dataset}
                      reason={reason}
                    />
                  </EuiDescriptionListDescription>
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

const categoryQualityWarningCalloutTitle = i18n.translate(
  'xpack.infra.logs.logEntryCategories.categoryQUalityWarningCalloutTitle',
  {
    defaultMessage: 'Quality warning',
  }
);

const CategoryQualityWarningReasonDescription: React.FC<{
  dataset: string;
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
