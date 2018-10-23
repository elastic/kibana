/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiSpacer,
  EuiDescriptionList,
  EuiCallOut,
  EuiAccordion,
} from '@elastic/eui';

export function ImportSummary({
  index,
  indexPattern,
  ingestPipelineId,
  docCount,
  importFailures,
}) {
  const items = createDisplayItems(
    index,
    indexPattern,
    ingestPipelineId,
    docCount,
    importFailures
  );

  return (
    <React.Fragment>
      <EuiCallOut
        title="Import complete"
        color="success"
        iconType="check"
      >
        <EuiDescriptionList
          type="column"
          listItems={items}
          className="import-summary-list"
        />
      </EuiCallOut>

      {(importFailures && importFailures.length > 0) &&
        <React.Fragment>
          <EuiSpacer size="m" />
          <EuiCallOut
            title="Some documents could not be imported"
            color="warning"
            iconType="help"
          >
            <p>
              {importFailures.length} out of {docCount} documents could not be imported.
              This could be due to lines not matching the Grok pattern.
            </p>

            <Failures failedDocs={importFailures} />
          </EuiCallOut>
        </React.Fragment>
      }
    </React.Fragment>
  );
}

function Failures({ failedDocs }) {
  return (
    <EuiAccordion
      id="failureList"
      buttonContent="Failed documents"
      paddingSize="m"
    >
      <div className="failure-list">
        {
          failedDocs.map(({ item, reason, doc }) => (
            <div key={item}>
              <div className="error-message">{item}: {reason}</div>
              <div>{JSON.stringify(doc)}</div>
            </div>
          ))
        }
      </div>
    </EuiAccordion>
  );
}

function createDisplayItems(
  index,
  indexPattern,
  ingestPipelineId,
  docCount,
  importFailures
) {
  const items = [
    {
      title: 'Index',
      description: index,
    },
    {
      title: 'Index pattern',
      description: indexPattern,
    },
    {
      title: 'Ingest pipeline',
      description: ingestPipelineId,
    },
    {
      title: 'Documents ingested',
      description: docCount - ((importFailures && importFailures.length) || 0),
    }
  ];

  if (importFailures && importFailures.length > 0) {
    items.push({
      title: 'Failed documents',
      description: importFailures.length,
    });
  }

  return items;
}
