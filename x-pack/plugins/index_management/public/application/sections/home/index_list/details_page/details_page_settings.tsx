/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiButton, EuiPageTemplate, EuiSpacer, EuiText } from '@elastic/eui';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLoadIndexSettings } from '../../../../services';
import { DetailsPageSettingsContent } from './details_page_settings_content';

export const DetailsPageSettings: FunctionComponent<{
  indexName: string;
}> = ({ indexName }) => {
  const { isLoading, data, error, resendRequest } = useLoadIndexSettings(indexName);

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.settings.loadingDescription"
          defaultMessage="Loading index settings…"
        />
      </SectionLoading>
    );
  }
  if (error || !data) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexDetailsSettingsError"
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.settings.errorTitle"
              defaultMessage="Unable to load index settings"
            />
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.settings.errorDescription"
                defaultMessage="We encountered an error loading settings for index {indexName}. Make sure that the index name in the URL is correct and try again."
                values={{
                  indexName,
                }}
              />
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={resendRequest}
              iconType="refresh"
              color="danger"
              data-test-subj="indexDetailsSettingsReloadButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.settings.reloadButtonLabel"
                defaultMessage="Reload"
              />
            </EuiButton>
          </>
        }
      />
    );
  }
  return (
    <DetailsPageSettingsContent
      data={data}
      indexName={indexName}
      reloadIndexSettings={resendRequest}
    />
  );
};
