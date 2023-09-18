/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
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

import { DiscoverLink } from '../../../../lib/discover_link';
import { SectionLoading, reactRouterNavigate } from '../../../../../shared_imports';
import { SectionError, Error, DataHealth } from '../../../../components';
import { useLoadDataStream } from '../../../../services/api';
import { DeleteDataStreamConfirmationModal } from '../delete_data_stream_confirmation_modal';
import { humanizeTimeStamp } from '../humanize_time_stamp';
import { getIndexListUri, getTemplateDetailsLink } from '../../../../services/routing';
import { ILM_PAGES_POLICY_EDIT } from '../../../../constants';
import { useAppContext } from '../../../../app_context';
import { DataStreamsBadges } from '../data_stream_badges';
import { useIlmLocator } from '../../../../services/use_ilm_locator';

interface DetailsListProps {
  details: Array<{
    name: string;
    toolTip: string;
    content: any;
    dataTestSubj: string;
  }>;
}

const DetailsList: React.FunctionComponent<DetailsListProps> = ({ details }) => {
  const descriptionListItems = details.map((detail, index) => {
    const { name, toolTip, content, dataTestSubj } = detail;

    return (
      <Fragment key={`${name}-${index}`}>
        <EuiDescriptionListTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>{name}</EuiFlexItem>

            <EuiFlexItem grow={false}>
              {toolTip && <EuiIconTip content={toolTip} position="top" />}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionListTitle>

        <EuiDescriptionListDescription data-test-subj={dataTestSubj}>
          {content}
        </EuiDescriptionListDescription>
      </Fragment>
    );
  });

  const midpoint = Math.ceil(descriptionListItems.length / 2);
  const descriptionListColumnOne = descriptionListItems.slice(0, midpoint);
  const descriptionListColumnTwo = descriptionListItems.slice(-midpoint);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiDescriptionList textStyle="reverse">{descriptionListColumnOne}</EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDescriptionList textStyle="reverse">{descriptionListColumnTwo}</EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface Props {
  dataStreamName: string;
  onClose: (shouldReload?: boolean) => void;
}

export const DataStreamDetailPanel: React.FunctionComponent<Props> = ({
  dataStreamName,
  onClose,
}) => {
  const { error, data: dataStream, isLoading } = useLoadDataStream(dataStreamName);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const ilmPolicyLink = useIlmLocator(ILM_PAGES_POLICY_EDIT, dataStream?.ilmPolicyName);
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
      lifecycle,
    } = dataStream;

    const getManagementDetails = () => {
      const managementDetails = [];

      if (lifecycle?.data_retention) {
        managementDetails.push({
          name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.dataRetentionTitle', {
            defaultMessage: 'Data retention',
          }),
          toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.dataRetentionToolTip', {
            defaultMessage: 'The amount of time to retain the data in the data stream.',
          }),
          content: lifecycle.data_retention,
          dataTestSubj: 'dataRetentionDetail',
        });
      }

      if (ilmPolicyName) {
        managementDetails.push({
          name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.ilmPolicyTitle', {
            defaultMessage: 'Index lifecycle policy',
          }),
          toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.ilmPolicyToolTip', {
            defaultMessage: `The index lifecycle policy that manages the data in the data stream.`,
          }),
          content: ilmPolicyLink ? (
            <EuiLink data-test-subj={'ilmPolicyLink'} href={ilmPolicyLink}>
              {ilmPolicyName}
            </EuiLink>
          ) : (
            ilmPolicyName
          ),
          dataTestSubj: 'ilmPolicyDetail',
        });
      }

      return managementDetails;
    };

    const defaultDetails = [
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.healthTitle', {
          defaultMessage: 'Health',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.healthToolTip', {
          defaultMessage: `The health of the data stream's current backing indices.`,
        }),
        content: <DataHealth health={health} />,
        dataTestSubj: 'healthDetail',
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.maxTimeStampTitle', {
          defaultMessage: 'Last updated',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.maxTimeStampToolTip', {
          defaultMessage: 'The most recent document to be added to the data stream.',
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
        dataTestSubj: 'lastUpdatedDetail',
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.storageSizeTitle', {
          defaultMessage: 'Storage size',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.storageSizeToolTip', {
          defaultMessage: `The total size of all shards in the data stream’s backing indices.`,
        }),
        content: storageSize,
        dataTestSubj: 'storageSizeDetail',
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indicesTitle', {
          defaultMessage: 'Indices',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indicesToolTip', {
          defaultMessage: `The data stream's current backing indices.`,
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
        dataTestSubj: 'indicesDetail',
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.timestampFieldTitle', {
          defaultMessage: 'Timestamp field',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.timestampFieldToolTip', {
          defaultMessage: 'The timestamp field shared by all documents in the data stream.',
        }),
        content: timeStampField.name,
        dataTestSubj: 'timestampDetail',
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.generationTitle', {
          defaultMessage: 'Generation',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.generationToolTip', {
          defaultMessage: 'The number of backing indices generated for the data stream.',
        }),
        content: generation,
        dataTestSubj: 'generationDetail',
      },
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indexTemplateTitle', {
          defaultMessage: 'Index template',
        }),
        toolTip: i18n.translate('xpack.idxMgmt.dataStreamDetailPanel.indexTemplateToolTip', {
          defaultMessage:
            'The index template that configured the data stream and configures its backing indices.',
        }),
        content: (
          <EuiLink
            data-test-subj={'indexTemplateLink'}
            {...reactRouterNavigate(history, getTemplateDetailsLink(indexTemplateName))}
          >
            {indexTemplateName}
          </EuiLink>
        ),
        dataTestSubj: 'indexTemplateDetail',
      },
    ];

    const managementDetails = getManagementDetails();
    const details = [...defaultDetails, ...managementDetails];

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
        onClose={() => onClose()}
        data-test-subj="dataStreamDetailPanel"
        aria-labelledby="dataStreamDetailPanelTitle"
        size="m"
        maxWidth={500}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 id="dataStreamDetailPanelTitle" data-test-subj="dataStreamDetailPanelTitle">
              {dataStreamName}
              <DiscoverLink indexName={dataStreamName} />
              {dataStream && <DataStreamsBadges dataStream={dataStream} />}
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

            {!isLoading && !error && dataStream?.privileges.delete_index ? (
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
