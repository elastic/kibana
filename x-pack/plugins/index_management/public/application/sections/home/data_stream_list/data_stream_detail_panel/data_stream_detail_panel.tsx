/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

import { SectionLoading, SectionError, Error } from '../../../../components';
import { useLoadDataStream } from '../../../../services/api';

interface Props {
  dataStreamName: string;
  onClose: () => void;
}

/**
 * NOTE: This currently isn't in use by data_stream_list.tsx because it doesn't contain any
 * information that doesn't already exist in the table. We'll use it once we add additional
 * info, e.g. storage size, docs count.
 */
export const DataStreamDetailPanel: React.FunctionComponent<Props> = ({
  dataStreamName,
  onClose,
}) => {
  const { error, data: dataStream, isLoading } = useLoadDataStream(dataStreamName);

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamDetailPanel.loadingDataStreamDescription"
          defaultMessage="Loading data stream"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.dataStreamDetailPanel.loadingDataStreamErrorMessage"
            defaultMessage="Error loading data stream"
          />
        }
        error={error as Error}
        data-test-subj="sectionError"
      />
    );
  } else if (dataStream) {
    const { timeStampField, generation } = dataStream;

    content = (
      <EuiDescriptionList textStyle="reverse">
        <EuiDescriptionListTitle>
          <FormattedMessage
            id="xpack.idxMgmt.dataStreamDetailPanel.timestampFieldTitle"
            defaultMessage="Timestamp field"
          />
        </EuiDescriptionListTitle>

        <EuiDescriptionListDescription>{timeStampField.name}</EuiDescriptionListDescription>

        <EuiDescriptionListTitle>
          <FormattedMessage
            id="xpack.idxMgmt.dataStreamDetailPanel.generationTitle"
            defaultMessage="Generation"
          />
        </EuiDescriptionListTitle>

        <EuiDescriptionListDescription>{generation}</EuiDescriptionListDescription>
      </EuiDescriptionList>
    );
  }

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="dataStreamDetailPanel"
      aria-labelledby="dataStreamDetailPanelTitle"
      size="m"
      maxWidth={500}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="dataStreamDetailPanelTitle" data-test-subj="dataStreamDetailPanelTitle">
            {dataStreamName}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">{content}</EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={onClose}
              data-test-subj="closeDetailsButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamDetailPanel.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
