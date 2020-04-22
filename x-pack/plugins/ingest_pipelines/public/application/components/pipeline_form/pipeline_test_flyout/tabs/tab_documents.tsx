/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiText } from '@elastic/eui';

import { getUseField, Field, JsonEditorField } from '../../../../../shared_imports';

const UseField = getUseField({ component: Field });

interface Props {
  isResultsLinkDisabled: boolean;
  changeTabs: () => void;
}

export const DocumentsTab: React.FunctionComponent<Props> = ({
  isResultsLinkDisabled,
  changeTabs,
}) => {
  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.testPipelineFlyout.documentsTab.descriptionText"
            defaultMessage="Provide an array of documents to be ingested by the pipeline and simulate the output."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      {/* Documents editor */}
      <UseField
        path="documents"
        component={JsonEditorField}
        componentProps={{
          ['data-test-subj']: 'documentsField',
          euiCodeEditorProps: {
            height: '300px',
            'aria-label': i18n.translate(
              'xpack.ingestPipelines.testPipelineFlyout.documentsFieldAriaLabel',
              {
                defaultMessage: 'Documents JSON editor',
              }
            ),
          },
        }}
      />
    </>
  );
};
