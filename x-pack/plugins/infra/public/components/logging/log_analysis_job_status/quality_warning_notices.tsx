/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import type {
  CategoryQualityWarningReason,
  QualityWarning,
} from '../../../containers/logs/log_analysis/log_analysis_module_types';

export const CategoryQualityWarnings: React.FC<{ qualityWarnings: QualityWarning[] }> = ({
  qualityWarnings,
}) => (
  <>
    {qualityWarnings.map((qualityWarning, qualityWarningIndex) => (
      <EuiCallOut
        key={`${qualityWarningIndex}`}
        title={categoryQualityWarningCalloutTitle}
        color="warning"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="xpack.infra.logs.logEntryCategories.categoryQualityWarningCalloutMessage"
            defaultMessage="While analyzing the log messages we've detected some problems which might indicate a reduced quality of the categorization results."
          />
        </p>
        <ul>
          {qualityWarning.reasons.map((reason, reasonIndex) => (
            <li key={`${reasonIndex}`}>
              <CategoryQualityWarningReasonDescription reason={reason} />
            </li>
          ))}
        </ul>
      </EuiCallOut>
    ))}
  </>
);

const categoryQualityWarningCalloutTitle = i18n.translate(
  'xpack.infra.logs.logEntryCategories.categoryQUalityWarningCalloutTitle',
  {
    defaultMessage: 'Quality warning',
  }
);

const CategoryQualityWarningReasonDescription: React.FC<{
  reason: CategoryQualityWarningReason;
}> = ({ reason }) => {
  switch (reason.type) {
    case 'singleCategory':
      return (
        <FormattedMessage
          id="xpack.infra.logs.logEntryCategories.singleCategoryWarningReasonDescription"
          defaultMessage="The analysis couldn't extract more than a single category from the log message."
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
