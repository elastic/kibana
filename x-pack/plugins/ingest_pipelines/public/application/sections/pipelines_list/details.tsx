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
  EuiSpacer,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { Pipeline } from '../../../../common/types';

import { PipelineDetailsJsonBlock } from './details_json_block';

export interface Props {
  pipeline: Pipeline;
  onEditClick: (pipelineName: string) => void;
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

        <EuiSpacer size="m" />

        <PipelineDetailsJsonBlock
          htmlForId="pipelineDetailsProcessorsJson"
          label={i18n.translate('xpack.ingestPipelines.list.pipelineDetails.processorsTitle', {
            defaultMessage: 'Processors JSON',
          })}
          json={pipeline.processors}
        />

        {/* On Failure Processor JSON */}
        {pipeline.on_failure?.length && (
          <>
            <EuiSpacer size="m" />
            <PipelineDetailsJsonBlock
              htmlForId="pipelineDetailsOnFailureProcessorsJson"
              label={i18n.translate(
                'xpack.ingestPipelines.list.pipelineDetails.failureProcessorsTitle',
                {
                  defaultMessage: 'On failure processors JSON',
                }
              )}
              json={pipeline.on_failure}
            />
          </>
        )}
        {/* End On Failure Processor JSON */}
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
              <EuiButtonEmpty onClick={() => onEditClick(pipeline.name)}>
                {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.editButtonLabel', {
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
