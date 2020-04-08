/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
  EuiCodeBlock,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { Pipeline } from '../../../../common/types';

export interface Props {
  pipeline: Pipeline;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onClose: () => void;
}

export const PipelineDetails: FunctionComponent<Props> = ({
  pipeline,
  onClose,
  onEditClick,
  onDeleteClick,
}) => {
  const descriptionListItems = [
    {
      title: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.descriptionTitle', {
        defaultMessage: 'Description',
      }),
      description: pipeline.description ?? '',
    },
  ];

  if (pipeline.version) {
    descriptionListItems.push({
      title: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.versionTitle', {
        defaultMessage: 'Version',
      }),
      description: String(pipeline.version),
    });
  }

  descriptionListItems.push({
    title: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.processorsTitle', {
      defaultMessage: 'Processors JSON',
    }),
    // We use this title from the description list and display the processors in a code block underneath
    description: '',
  });

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="pipelineDetailsFlyoutTitle"
      size="m"
      maxWidth={550}
    >
      <EuiFlyoutHeader>
        <EuiTitle id="pipelineDetailsFlyoutTitle">
          <h2>{pipeline.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList listItems={descriptionListItems} />
        <EuiCodeBlock overflowHeight={500} isCopyable language="json">
          {JSON.stringify(pipeline.processors, null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onEditClick}>
                {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.deleteButtonLabel', {
                  defaultMessage: 'Edit',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="danger" onClick={onDeleteClick}>
                {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.deleteButtonLabel', {
                  defaultMessage: 'Delete',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
