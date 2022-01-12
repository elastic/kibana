/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

export const Instructions: FC = () => {
  return (
    <div>
      <EuiFlexGroup data-test-subj="createFromCsvInstructions">
        <EuiFlexItem>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.ingestPipelines.createFromCsv.instructions"
                defaultMessage="Use a CSV file to define how to map your custom data source to the
                Elastic Common Schema (ECS). For each {source} , you can specify a {destination}
                and format adjustments. Refer to the &nbsp;{templateLink} for the supported headers."
                values={{
                  templateLink: (
                    <EuiLink href="https://ela.st/sample-pipeline-mapping" target="_blank">
                      sample mappings
                    </EuiLink>
                  ),
                  source: <EuiCode>source_field</EuiCode>,
                  destination: <EuiCode>destination_field</EuiCode>,
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.ingestPipelines.createFromCsv.instructions.continued"
                defaultMessage="Add processors to the resulting starter pipeline to perform additional data transformations."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
