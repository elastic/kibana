/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIconTip,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';

import { reactRouterNavigate } from '../../../../../shared_imports';
import { SectionLoading, SectionError, Error } from '../../../../components';
import { useLoadDataStream } from '../../../../services/api';
import { DeleteDataStreamConfirmationModal } from '../delete_data_stream_confirmation_modal';

interface Props {
  dataStreamName: string;
  backingIndicesLink: ReturnType<typeof reactRouterNavigate>;
  onClose: (shouldReload?: boolean) => void;
}

export const DataStreamDetailPanel: React.FunctionComponent<Props> = ({
  dataStreamName,
  backingIndicesLink,
  onClose,
}) => {
  const { error, data: dataStream, isLoading } = useLoadDataStream(dataStreamName);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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
    const { indices, timeStampField, generation } = dataStream;

    content = (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.idxMgmt.dataStreamDetailPanel.indicesTitle"
                    defaultMessage="Indices"
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.idxMgmt.dataStreamDetailPanel.indicesToolTip"
                        defaultMessage="The data stream's current backing indices"
                      />
                    }
                    position="top"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription>
              <EuiLink {...backingIndicesLink}>{indices.length}</EuiLink>
            </EuiDescriptionListDescription>

            <EuiDescriptionListTitle>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.idxMgmt.dataStreamDetailPanel.timestampFieldTitle"
                    defaultMessage="Timestamp field"
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.idxMgmt.dataStreamDetailPanel.timestampFieldToolTip"
                        defaultMessage="Timestamp field shared by all documents in the data stream"
                      />
                    }
                    position="top"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription>{timeStampField.name}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.idxMgmt.dataStreamDetailPanel.generationTitle"
                    defaultMessage="Generation"
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.idxMgmt.dataStreamDetailPanel.generationToolTip"
                        defaultMessage="Cumulative count of backing indices created for the data stream"
                      />
                    }
                    position="top"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription>{generation}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {isDeleting ? (
        <DeleteDataStreamConfirmationModal
          onClose={(data) => {
            if (data && data.hasDeletedDataStreams) {
              onClose(true);
            } else {
              setIsDeleting(false);
            }
          }}
          dataStreams={[dataStreamName]}
        />
      ) : null}

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
                onClick={() => onClose()}
                data-test-subj="closeDetailsButton"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.dataStreamDetailPanel.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>

            {!isLoading && !error ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  iconType="trash"
                  onClick={() => setIsDeleting(true)}
                  data-test-subj="deleteDataStreamButton"
                >
                  <FormattedMessage
                    id="xpack.idxMgmt.dataStreamDetailPanel.deleteButtonLabel"
                    defaultMessage="Delete data stream"
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
