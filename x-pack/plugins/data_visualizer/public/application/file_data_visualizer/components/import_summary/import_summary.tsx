/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

import { EuiSpacer, EuiDescriptionList, EuiCallOut } from '@elastic/eui';
import { DocFailure, Failures } from './failures';

interface Props {
  index: string;
  dataView: string;
  ingestPipelineId: string;
  docCount: number;
  importFailures: DocFailure[];
  createDataView: boolean;
  createPipeline: boolean;
}

export const ImportSummary: FC<Props> = ({
  index,
  dataView,
  ingestPipelineId,
  docCount,
  importFailures,
  createDataView,
  createPipeline,
}) => {
  const items = createDisplayItems(
    index,
    dataView,
    ingestPipelineId,
    docCount,
    importFailures,
    createDataView,
    createPipeline
  );

  return (
    <React.Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.dataVisualizer.file.importSummary.importCompleteTitle"
            defaultMessage="Import complete"
          />
        }
        color="success"
        iconType="check"
        data-test-subj="dataVisualizerFileImportSuccessCallout"
      >
        <EuiDescriptionList type="column" listItems={items} className="import-summary-list" />
      </EuiCallOut>

      {importFailures && importFailures.length > 0 && (
        <React.Fragment>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.file.importSummary.documentsCouldNotBeImportedTitle"
                defaultMessage="Some documents could not be imported"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="xpack.dataVisualizer.file.importSummary.documentsCouldNotBeImportedDescription"
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
  dataView: string,
  ingestPipelineId: string,
  docCount: number,
  importFailures: DocFailure[],
  createDataView: boolean,
  createPipeline: boolean
) {
  const items = [
    {
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importSummary.indexTitle"
          defaultMessage="Index"
        />
      ),
      description: index,
    },
    {
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importSummary.documentsIngestedTitle"
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
          id="xpack.dataVisualizer.file.importSummary.ingestPipelineTitle"
          defaultMessage="Ingest pipeline"
        />
      ),
      description: ingestPipelineId,
    });
  }

  if (createDataView) {
    items.splice(1, 0, {
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importSummary.dataViewTitle"
          defaultMessage="Data view"
        />
      ),
      description: dataView,
    });
  }

  if (importFailures && importFailures.length > 0) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importSummary.failedDocumentsTitle"
          defaultMessage="Failed documents"
        />
      ),
      description: importFailures.length,
    });
  }

  return items;
}
