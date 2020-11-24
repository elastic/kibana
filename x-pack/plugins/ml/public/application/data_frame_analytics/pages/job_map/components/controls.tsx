/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useContext, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiPortal,
  EuiTitle,
} from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { CytoscapeContext } from './cytoscape';
import { formatHumanReadableDateTimeSeconds } from '../../../../../../common/util/date_utils';
import { JOB_MAP_NODE_TYPES } from '../../../../../../common/constants/data_frame_analytics';
import { checkPermission } from '../../../../capabilities/check_capabilities';
import { useMlKibana, useNavigateToPath } from '../../../../contexts/kibana';
import { getIndexPatternIdFromName } from '../../../../util/index_utils';
import { useNavigateToWizardWithClonedJob } from '../../analytics_management/components/action_clone/clone_action_name';
import {
  useDeleteAction,
  DeleteActionModal,
} from '../../analytics_management/components/action_delete';

interface Props {
  analyticsId?: string;
  details: any;
  getNodeData: any;
  modelId?: string;
  updateElements: any;
}

function getListItems(details: object): EuiDescriptionListProps['listItems'] {
  return Object.entries(details).map(([key, value]) => {
    let description;
    if (key === 'create_time') {
      description = formatHumanReadableDateTimeSeconds(moment(value).unix() * 1000);
    } else {
      description =
        typeof value === 'object' ? (
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
            {JSON.stringify(value, null, 2)}
          </EuiCodeBlock>
        ) : (
          value
        );
    }

    return {
      title: key,
      description,
    };
  });
}

export const Controls: FC<Props> = ({
  analyticsId,
  details,
  getNodeData,
  modelId,
  updateElements,
}) => {
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<cytoscape.NodeSingular | undefined>();
  const canDeleteDataFrameAnalytics: boolean = checkPermission('canDeleteDataFrameAnalytics');
  const deleteAction = useDeleteAction(canDeleteDataFrameAnalytics);
  const { deleteItem, deleteTargetIndex, isModalVisible, openModal } = deleteAction;
  const {
    services: { notifications },
  } = useMlKibana();
  const navigateToPath = useNavigateToPath();
  const navigateToWizardWithClonedJob = useNavigateToWizardWithClonedJob();

  const cy = useContext(CytoscapeContext);
  const deselect = useCallback(() => {
    if (cy) {
      cy.elements().unselect();
    }
    setShowFlyout(false);
    setSelectedNode(undefined);
  }, [cy, setSelectedNode]);

  const nodeId = selectedNode?.data('id');
  const nodeLabel = selectedNode?.data('label');
  const nodeType = selectedNode?.data('type');

  const onCreateJobClick = useCallback(async () => {
    const indexId = getIndexPatternIdFromName(nodeLabel);

    if (indexId) {
      await navigateToPath(`/data_frame_analytics/new_job?index=${encodeURIComponent(indexId)}`);
    } else {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.indexPatternMissingMessage', {
          defaultMessage:
            'To create a job from this index please create an index pattern for {indexTitle}.',
          values: { indexTitle: nodeLabel },
        })
      );
    }
  }, [nodeLabel]);

  const onCloneJobClick = useCallback(async () => {
    navigateToWizardWithClonedJob({ config: details[nodeId], stats: details[nodeId]?.stats });
  }, [nodeId]);

  // Set up Cytoscape event handlers
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = (event) => {
      setSelectedNode(event.target);
      setShowFlyout(true);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', deselect);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
      }
    };
  }, [cy, deselect]);

  useEffect(() => {
    // Update elements and close the flyout
    if (isModalVisible === false && deleteItem === true) {
      let destIndexNode;
      if (deleteTargetIndex === true) {
        const jobDetails = details[nodeId];
        const destIndex = jobDetails.dest.index;
        destIndexNode = `${destIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;
      }
      updateElements(nodeId, destIndexNode);
      setShowFlyout(false);
    }
  }, [isModalVisible, deleteItem]);

  if (showFlyout === false) {
    return null;
  }

  const nodeDataButton =
    analyticsId !== nodeLabel &&
    modelId !== nodeLabel &&
    (nodeType === JOB_MAP_NODE_TYPES.ANALYTICS || nodeType === JOB_MAP_NODE_TYPES.INDEX) ? (
      <EuiButtonEmpty
        onClick={() => {
          getNodeData({ id: nodeLabel, type: nodeType });
          setShowFlyout(false);
        }}
        iconType="branch"
      >
        <FormattedMessage
          id="xpack.ml.dataframe.analyticsMap.flyout.fetchRelatedNodesButton"
          defaultMessage="Fetch related nodes"
        />
      </EuiButtonEmpty>
    ) : null;

  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        size="m"
        onClose={() => setShowFlyout(false)}
        data-test-subj="mlAnalyticsJobMapFlyout"
      >
        <EuiFlyoutHeader>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3 data-test-subj="mlDataFrameAnalyticsNodeDetailsTitle">
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsMap.flyoutHeaderTitle"
                    defaultMessage="Details for {type} {id}"
                    values={{ id: nodeLabel, type: nodeType }}
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiDescriptionList
                compressed
                type="column"
                listItems={
                  nodeType === 'index-pattern'
                    ? getListItems(details[nodeId][nodeLabel])
                    : getListItems(details[nodeId])
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>{nodeDataButton}</EuiFlexItem>
            {nodeType === JOB_MAP_NODE_TYPES.ANALYTICS && (
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => {
                      openModal({ config: details[nodeId], stats: details[nodeId]?.stats });
                    }}
                    iconType="trash"
                    color="danger"
                    size="s"
                  >
                    <FormattedMessage
                      id="xpack.ml.dataframe.analyticsMap.flyout.deleteJobButton"
                      defaultMessage="Delete job"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={onCloneJobClick} iconType="copy" color="primary" size="s">
                    <FormattedMessage
                      id="xpack.ml.dataframe.analyticsMap.flyout.cloneJobButton"
                      defaultMessage="Clone job"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            {nodeType === JOB_MAP_NODE_TYPES.INDEX && (
              <EuiButton
                onClick={onCreateJobClick}
                iconType="plusInCircle"
                color="primary"
                size="s"
              >
                <FormattedMessage
                  id="xpack.ml.dataframe.analyticsMap.flyout.createJobButton"
                  defaultMessage="Create job from this index"
                />
              </EuiButton>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
      <EuiFlexItem grow={false}>{nodeDataButton}</EuiFlexItem>
      {isModalVisible && <DeleteActionModal {...deleteAction} />}
    </EuiPortal>
  );
};
