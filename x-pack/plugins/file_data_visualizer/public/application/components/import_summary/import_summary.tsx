/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import { EuiSpacer, EuiDescriptionList, EuiCallOut } from '@elastic/eui';
import { DocFailure, Failures } from './failures';

interface Props {
  index: string;
  indexPattern: string;
  ingestPipelineId: string;
  docCount: number;
  importFailures: DocFailure[];
  createIndexPattern: boolean;
  createPipeline: boolean;
}

export const ImportSummary: FC<Props> = ({
  index,
  indexPattern,
  ingestPipelineId,
  docCount,
  importFailures,
  createIndexPattern,
  createPipeline,
}) => {
  const items = createDisplayItems(
    index,
    indexPattern,
    ingestPipelineId,
    docCount,
    importFailures,
    createIndexPattern,
    createPipeline
  );

  return (
    <React.Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.fileDataVisualizer.importSummary.importCompleteTitle"
            defaultMessage="Import complete"
          />
        }
        color="success"
        iconType="check"
        data-test-subj="mlFileImportSuccessCallout"
      >
        <EuiDescriptionList type="column" listItems={items} className="import-summary-list" />
      </EuiCallOut>

      {importFailures && importFailures.length > 0 && (
        <React.Fragment>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.fileDataVisualizer.importSummary.documentsCouldNotBeImportedTitle"
                defaultMessage="Some documents could not be imported"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="xpack.fileDataVisualizer.importSummary.documentsCouldNotBeImportedDescription"
                defaultMessage="{importFailuresLength} out of {docCount} documents could not be imported.
                This could be due to lines not matching the Grok pattern."
                values={{
                  importFailuresLength: importFailures.length,
                  docCount,
                }}
              />
            </p>

            <Failures failedDocs={importFailures} />
          </EuiCallOut>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

function createDisplayItems(
  index: string,
  indexPattern: string,
  ingestPipelineId: string,
  docCount: number,
  importFailures: DocFailure[],
  createIndexPattern: boolean,
  createPipeline: boolean
) {
  const items = [
    {
      title: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.importSummary.indexTitle"
          defaultMessage="Index"
        />
      ),
      description: index,
    },
    {
      title: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.importSummary.documentsIngestedTitle"
          defaultMessage="Documents ingested"
        />
      ),
      description: docCount - ((importFailures && importFailures.length) || 0),
    },
  ];

  if (createPipeline) {
    items.splice(1, 0, {
      title: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.importSummary.ingestPipelineTitle"
          defaultMessage="Ingest pipeline"
        />
      ),
      description: ingestPipelineId,
    });
  }

  if (createIndexPattern) {
    items.splice(1, 0, {
      title: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.importSummary.indexPatternTitle"
          defaultMessage="Index pattern"
        />
      ),
      description: indexPattern,
    });
  }

  if (importFailures && importFailures.length > 0) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.importSummary.failedDocumentsTitle"
          defaultMessage="Failed documents"
        />
      ),
      description: importFailures.length,
    });
  }

  return items;
}
