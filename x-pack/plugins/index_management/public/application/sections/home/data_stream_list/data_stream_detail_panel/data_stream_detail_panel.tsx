/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
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
import { SectionLoading, SectionError, Error, DataHealth } from '../../../../components';
import { useLoadDataStream } from '../../../../services/api';
import { DeleteDataStreamConfirmationModal } from '../delete_data_stream_confirmation_modal';
import { humanizeTimeStamp } from '../humanize_time_stamp';
import { useUrlGenerator } from '../../../../services/use_url_generator';
import { getIndexListUri, getTemplateDetailsLink } from '../../../../services/routing';
import { ILM_PAGES_POLICY_EDIT, ILM_URL_GENERATOR_ID } from '../../../../constants';
import { useAppContext } from '../../../../app_context';

interface DetailsListProps {
  details: Array<{
    name: string;
    toolTip: string;
    content: any;
  }>;
}

const DetailsList: React.FunctionComponent<DetailsListProps> = ({ details }) => {
  const groups: any[] = [];
  let items: any[];

  details.forEach((detail, index) => {
    const { name, toolTip, content } = detail;

    if (index % 2 === 0) {
      items = [];

      groups.push(<EuiFlexGroup key={groups.length}>{items}</EuiFlexGroup>);
    }

    items.push(
      <EuiFlexItem key={name}>
        <EuiDescriptionListTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>{name}</EuiFlexItem>

            <EuiFlexItem grow={false}>
              {toolTip && <EuiIconTip content={toolTip} position="top" />}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionListTitle>

        <EuiDescriptionListDescription>{content}</EuiDescriptionListDescription>
      </EuiFlexItem>
    );
  });

  return <EuiDescriptionList textStyle="reverse">{groups}</EuiDescriptionList>;
};

interface Props {
  dataStreamName: string;
  onClose: (shouldReload?: boolean) => void;
  canDelete: boolean;
}

export const DataStreamDetailPanel: React.FunctionComponent<Props> = ({
  dataStreamName,
  onClose,
  canDelete,
}) => {
  const { error, data: dataStream, isLoading } = useLoadDataStream(dataStreamName);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const ilmPolicyLink = useUrlGenerator({
    urlGeneratorId: ILM_URL_GENERATOR_ID,
    urlGeneratorState: {
      page: ILM_PAGES_POLICY_EDIT,
      policyName: dataStream?.ilmPolicyName,
    },
  });
  const { history } = useAppContext();

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        {i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.loadingDataStreamDescription', {
          defaultMessage: 'Loading data stream',
        })}
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.loadingDataStreamErrorMessage', {
          defaultMessage: 'Error loading data stream',
        })}
        error={error as Error}
        data-test-subj="sectionError"
      />
    );
  } else if (dataStream) {
    const {
      health,
      indices,
      timeStampField,
      generation,
      indexTemplateName,
      ilmPolicyName,
      storageSize,
      maxTimeStamp,
    } = dataStream;
    const details = [
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.healthTitle', {
          defaultMessage: 'Health',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.healthToolTip', {
          defaultMessage: `The health of the data stream's current backing indices`,
        }),
        content: <DataHealth health={health} />,
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.maxTimeStampTitle', {
          defaultMessage: 'Last updated',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.maxTimeStampToolTip', {
          defaultMessage: 'The most recent document to be added to the data stream',
        }),
        content: maxTimeStamp ? (
          humanizeTimeStamp(maxTimeStamp)
        ) : (
          <em>
            {i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.maxTimeStampNoneMessage', {
              defaultMessage: `Never`,
            })}
          </em>
        ),
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.storageSizeTitle', {
          defaultMessage: 'Storage size',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.storageSizeToolTip', {
          defaultMessage: `Total size of all shards in the data stream’s backing indices`,
        }),
        content: storageSize,
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indicesTitle', {
          defaultMessage: 'Indices',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indicesToolTip', {
          defaultMessage: `The data stream's current backing indices`,
        }),
        content: (
          <EuiLink
            {...reactRouterNavigate(
              history,
              getIndexListUri(`data_stream="${dataStreamName}"`, true)
            )}
          >
            {indices.length}
          </EuiLink>
        ),
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.timestampFieldTitle', {
          defaultMessage: 'Timestamp field',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.timestampFieldToolTip', {
          defaultMessage: 'Timestamp field shared by all documents in the data stream',
        }),
        content: timeStampField.name,
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.generationTitle', {
          defaultMessage: 'Generation',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.generationToolTip', {
          defaultMessage: 'Cumulative count of backing indices created for the data stream',
        }),
        content: generation,
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indexTemplateTitle', {
          defaultMessage: 'Index template',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indexTemplateToolTip', {
          defaultMessage:
            'The index template that configured the data stream and configures its backing indices',
        }),
        content: (
          <EuiLink
            data-test-subj={'indexTemplateLink'}
            {...reactRouterNavigate(history, getTemplateDetailsLink(indexTemplateName))}
          >
            {indexTemplateName}
          </EuiLink>
        ),
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.ilmPolicyTitle', {
          defaultMessage: 'Index lifecycle policy',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.ilmPolicyToolTip', {
          defaultMessage: `The index lifecycle policy that manages the data stream's data`,
        }),
        content:
          ilmPolicyName && ilmPolicyLink ? (
            <EuiLink data-test-subj={'ilmPolicyLink'} href={ilmPolicyLink}>
              {ilmPolicyName}
            </EuiLink>
          ) : (
            ilmPolicyName || (
              <em>
                {i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.ilmPolicyContentNoneMessage', {
                  defaultMessage: `None`,
                })}
              </em>
            )
          ),
      },
    ];

    content = <DetailsList details={details} />;
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
                {i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.closeButtonLabel', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>

            {!isLoading && !error && canDelete ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  iconType="trash"
                  onClick={() => setIsDeleting(true)}
                  data-test-subj="deleteDataStreamButton"
                >
                  {i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.deleteButtonLabel', {
                    defaultMessage: 'Delete data stream',
                  })}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
