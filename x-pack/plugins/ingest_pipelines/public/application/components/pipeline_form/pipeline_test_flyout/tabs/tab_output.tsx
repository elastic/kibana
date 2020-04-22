/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';

import { getUseField, Field } from '../../../../../shared_imports';

const UseField = getUseField({ component: Field });

interface Props {
  executeOutput: { docs: object[] };
}

export const OutputTab: React.FunctionComponent<Props> = ({ executeOutput }) => {
  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.testPipelineFlyout.outputTab.descriptionText"
            defaultMessage="The output of the executed pipeline."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <UseField
        path="verbose"
        componentProps={{
          ['data-test-subj']: 'verboseField',
        }}
      />

      <EuiSpacer size="m" />

      <EuiCodeBlock language="json" isCopyable>
        {JSON.stringify(executeOutput, null, 2)}
      </EuiCodeBlock>
    </>
  );
};
