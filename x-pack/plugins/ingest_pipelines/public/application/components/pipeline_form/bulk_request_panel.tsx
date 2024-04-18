/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiPanel,
  EuiCodeBlock,
  EuiText,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';

const bulkRequestExample = `POST _bulk?pipeline=my-pipeline-name
{ "index" : { "_index" : "books" } }
{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}
{ "index" : { "_index" : "books" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
`;

const singleRequestExample = `POST pipeline=my-pipeline-name
{ "index" :
  { "_index" : "books" }
}
`;

export const BulkRequestPanel = () => {
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

      <EuiSpacer size="m" />

      <EuiCodeBlock language="json" overflowHeight={250} isCopyable>
        {showBulkToggle ? bulkRequestExample : singleRequestExample}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
