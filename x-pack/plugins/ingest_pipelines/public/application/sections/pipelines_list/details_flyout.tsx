/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiIcon,
  EuiPopover,
  EuiContextMenu,
  EuiButton,
} from '@elastic/eui';

import { Pipeline } from '../../../../common/types';

import { PipelineDetailsJsonBlock } from './details_json_block';

export interface Props {
  pipeline: Pipeline;
  onEditClick: (pipelineName: string) => void;
  onCloneClick: (pipelineName: string) => void;
  onDeleteClick: (pipelineName: string[]) => void;
  onClose: () => void;
}

export const PipelineDetailsFlyout: FunctionComponent<Props> = ({
  pipeline,
  onClose,
  onEditClick,
  onCloneClick,
  onDeleteClick,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const actionMenuItems = [
    /**
     * Edit pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.editActionLabel', {
        defaultMessage: 'Edit',
      }),
      icon: <EuiIcon type="pencil" />,
      onClick: () => onEditClick(pipeline.name),
    },
    /**
     * Clone pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.cloneActionLabel', {
        defaultMessage: 'Clone',
      }),
      icon: <EuiIcon type="copy" />,
      onClick: () => onCloneClick(pipeline.name),
    },
    /**
     * Delete pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.pipelineDetails.deleteActionLabel', {
        defaultMessage: 'Delete',
      }),
      icon: <EuiIcon type="trash" />,
      onClick: () => {
        setShowPopover(false);
        onDeleteClick([pipeline.name]);
      },
    },
  ];

  const managePipelineButton = (
    <EuiButton
      data-test-subj="managePipelineButton"
      aria-label={i18n.translate(
        'xpack.ingestPipelines.list.pipelineDetails.managePipelineActionsAriaLabel',
        {
          defaultMessage: 'Manage pipeline',
        }
      )}
      onClick={() => setShowPopover((previousBool) => !previousBool)}
      iconType="arrowUp"
      iconSide="right"
      fill
    >
      {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.managePipelineButtonLabel', {
        defaultMessage: 'Manage',
      })}
    </EuiButton>
  );

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="pipelineDetailsFlyoutTitle"
      data-test-subj="pipelineDetails"
      size="m"
      maxWidth={550}
    >
      <EuiFlyoutHeader>
        <EuiTitle id="pipelineDetailsFlyoutTitle" data-test-subj="title">
          <h2>{pipeline.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList>
          {/* Pipeline description */}
          {pipeline.description && (
            <>
              <EuiDescriptionListTitle>
                {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.descriptionTitle', {
                  defaultMessage: 'Description',
                })}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{pipeline.description}</EuiDescriptionListDescription>
            </>
          )}

          {/* Pipeline version */}
          {pipeline.version && (
            <>
              <EuiDescriptionListTitle>
                {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.versionTitle', {
                  defaultMessage: 'Version',
                })}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {String(pipeline.version)}
              </EuiDescriptionListDescription>
            </>
          )}

          {/* Processors JSON */}
          <EuiDescriptionListTitle>
            {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.processorsTitle', {
              defaultMessage: 'Processors',
            })}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <PipelineDetailsJsonBlock json={pipeline.processors} />
          </EuiDescriptionListDescription>

          {/* On Failure Processor JSON */}
          {pipeline.on_failure?.length && (
            <>
              <EuiDescriptionListTitle>
                {i18n.translate(
                  'xpack.ingestPipelines.list.pipelineDetails.failureProcessorsTitle',
                  {
                    defaultMessage: 'Failure processors',
                  }
                )}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <PipelineDetailsJsonBlock json={pipeline.on_failure} />
              </EuiDescriptionListDescription>
            </>
          )}
        </EuiDescriptionList>
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
              <EuiPopover
                isOpen={showPopover}
                closePopover={() => setShowPopover(false)}
                button={managePipelineButton}
                panelPaddingSize="none"
                withTitle
                repositionOnScroll
              >
                <EuiContextMenu
                  initialPanelId={0}
                  data-test-subj="autoFollowPatternActionContextMenu"
                  panels={[
                    {
                      id: 0,
                      title: i18n.translate(
                        'xpack.ingestPipelines.list.pipelineDetails.managePipelinePanelTitle',
                        {
                          defaultMessage: 'Pipeline options',
                        }
                      ),
                      items: actionMenuItems,
                    },
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
