/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
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
                id="xpack.ingestPipelines.createFromCsv.instructions.link"
                defaultMessage="Map your CSV into a starter ingest pipeline. Reference&nbsp;{templateLink} for more information."
                values={{
                  templateLink: (
                    <EuiLink
                      href="https://docs.google.com/spreadsheets/d/1m5JiOTeZtUueW3VOVqS8bFYqNGEEyp0jAsgO12NFkNM/edit#gid=0"
                      target="_blank"
                    >
                      sample mapping templates
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              Two headers are required: <EuiCode>source_field</EuiCode> and{' '}
              <EuiCode>destination_field</EuiCode>, but please see the linked template for more
              header information.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              Please note that this tool generates starter pipelines. It will only perform field{' '}
              <strong>rename</strong> and <strong>copy</strong> operations, as well as some field
              format adjustments. It&apos;s up to you to integrate them in a complete pipeline that
              ingests and outputs the data however you need.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
