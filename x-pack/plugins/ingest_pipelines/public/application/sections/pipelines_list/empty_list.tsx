/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiLink, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { EuiButtonReactRouter } from '../../../../../../../src/plugins/kibana_react/public';
import { useKibana } from '../../../shared_imports';

export const EmptyList: FunctionComponent = () => {
  const { services } = useKibana();

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiEmptyPrompt
          iconType="managementApp"
          data-test-subj="emptyList"
          title={
            <h2 data-test-subj="title">
              {i18n.translate('xpack.ingestPipelines.list.table.emptyPromptTitle', {
                defaultMessage: 'Start by creating a pipeline',
              })}
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.ingestPipelines.list.table.emptyPromptDescription"
                defaultMessage="For example, you might create a pipeline with one processor that removes a field and another processor that renames a field."
              />
              <br />
              <EuiLink href={services.documentation.getIngestNodeUrl()} target="_blank" external>
                {i18n.translate('xpack.ingestPipelines.list.table.emptyPromptDocumentionLink', {
                  defaultMessage: 'Learn more',
                })}
              </EuiLink>
            </p>
          }
          actions={
            <EuiButtonReactRouter to="/create" iconType="plusInCircle" fill>
              {i18n.translate('xpack.ingestPipelines.list.table.emptyPrompt.createButtonLabel', {
                defaultMessage: 'Create a pipeline',
              })}
            </EuiButtonReactRouter>
          }
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
