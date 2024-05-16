/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiCodeBlock,
  EuiText,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { useKibana } from '../../../shared_imports';

const bulkRequestExample = `PUT books/_bulk?pipeline=my-pipeline
{ "create":{ } }
{ "@timestamp": "2099-03-07T11:04:06.000Z", "my-keyword-field": "foo" }
{ "create":{ } }
{ "@timestamp": "2099-03-07T11:04:07.000Z", "my-keyword-field": "bar" }
`;

const singleRequestExample = `POST books/_doc?pipeline=my-pipeline-name
{
  "@timestamp": "2099-03-07T11:04:05.000Z",
  "my-keyword-field": "foo"
}
`;

export const BulkRequestPanel = () => {
  const { services } = useKibana();
  const [showBulkToggle, setShowBulkToggle] = useState(true);

  return (
    <EuiPanel hasShadow={false} hasBorder grow={false}>
      <EuiText size="s">
        <strong>
          <FormattedMessage
            id="xpack.ingestPipelines.form.bulkCardTitle"
            defaultMessage="How to use this pipeline during data ingestion"
          />
        </strong>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={
              <FormattedMessage
                id="xpack.ingestPipelines.form.bulkRequestToggle"
                defaultMessage="Bulk request"
              />
            }
            checked={showBulkToggle}
            onChange={(e: EuiSwitchEvent) => setShowBulkToggle(e.target.checked)}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <TryInConsoleButton
            request={showBulkToggle ? bulkRequestExample : singleRequestExample}
            application={services.application}
            consolePlugin={services.consolePlugin}
            sharePlugin={services.share}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiCodeBlock language="json" overflowHeight={250} isCopyable>
        {showBulkToggle ? bulkRequestExample : singleRequestExample}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
