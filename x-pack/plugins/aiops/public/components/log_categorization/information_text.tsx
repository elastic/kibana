/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  eventRateLength: number;
  fieldSelected: boolean;
  categoriesLength: number | null;
  loading: boolean;
}

export const InformationText: FC<Props> = ({
  eventRateLength,
  fieldSelected,
  categoriesLength,
  loading,
}) => {
  if (loading === true) {
    return null;
  }
  return (
    <>
      {eventRateLength === 0 ? (
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logCategorization.noDocsTitle"
                defaultMessage="No documents found"
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.logCategorization.noDocsBody"
                defaultMessage="Ensure the selected time range contains documents."
              />
            </p>
          }
          data-test-subj="aiopsNoWindowParametersEmptyPrompt"
        />
      ) : null}

      {eventRateLength > 0 && categoriesLength === null ? (
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logCategorization.emptyPromptTitle"
                defaultMessage="Select a text field and click run categorization to start analysis"
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.logCategorization.emptyPromptBody"
                defaultMessage="Log pattern analysis groups messages into common patterns."
              />
            </p>
          }
          data-test-subj="aiopsNoWindowParametersEmptyPrompt"
        />
      ) : null}

      {eventRateLength > 0 && categoriesLength !== null && categoriesLength === 0 ? (
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.logCategorization.noCategoriesTitle"
                defaultMessage="No patterns found"
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.logCategorization.noCategoriesBody"
                defaultMessage="Ensure the selected field is populated in the selected time range."
              />
            </p>
          }
          data-test-subj="aiopsNoWindowParametersEmptyPrompt"
        />
      ) : null}
    </>
  );
};
