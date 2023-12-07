/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import cytoscape from 'cytoscape';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import {
  EuiButton,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiDescriptionListProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiPopover,
  EuiPortal,
  EuiTitle,
} from '@elastic/eui';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import { CytoscapeContext } from './cytoscape';
import { ML_PAGES } from '../../../../../../common/constants/locator';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import {
  useMlLocator,
  useNotifications,
  useNavigateToPath,
  useMlKibana,
} from '../../../../contexts/kibana';
import { useEnabledFeatures } from '../../../../contexts/ml';
import { getDataViewIdFromName } from '../../../../util/index_utils';
import { useNavigateToWizardWithClonedJob } from '../../analytics_management/components/action_clone/clone_action_name';
import {
  useDeleteAction,
  DeleteActionModal,
} from '../../analytics_management/components/action_delete';
import { DeleteSpaceAwareItemCheckModal } from '../../../../components/delete_space_aware_item_check_modal';

interface Props {
  details: Record<string, any>;
  getNodeData: any;
  modelId?: string;
  updateElements: (nodeId: string, nodeLabel: string, destIndexNode?: string) => void;
  refreshJobsCallback: () => void;
}

function getListItemsFactory(showLicenseInfo: boolean) {
  return (details: Record<string, any>): EuiDescriptionListProps['listItems'] => {
    if (showLicenseInfo === false) {
      delete details.license_level;
    }

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
  };
}

export const Controls: FC<Props> = React.memo(
  ({ details, getNodeData, modelId, refreshJobsCallback, updateElements }) => {
    const [showFlyout, setShowFlyout] = useState<boolean>(false);
    const [selectedNode, setSelectedNode] = useState<cytoscape.NodeSingular | undefined>();
    const [isPopoverOpen, setPopover] = useState<boolean>(false);
    const [didUntag, setDidUntag] = useState<boolean>(false);

    const canCreateDataFrameAnalytics: boolean = usePermissionCheck('canCreateDataFrameAnalytics');
    const canDeleteDataFrameAnalytics: boolean = usePermissionCheck('canDeleteDataFrameAnalytics');
    const deleteAction = useDeleteAction(canDeleteDataFrameAnalytics);
    const { showLicenseInfo } = useEnabledFeatures();
    const getListItems = useMemo(() => getListItemsFactory(showLicenseInfo), [showLicenseInfo]);

    const {
      closeDeleteJobCheckModal,
      deleteItem,
      deleteTargetIndex,
      isModalVisible,
      isDeleteJobCheckModalVisible,
      item,
      jobType,
      openModal,
      openDeleteJobCheckModal,
    } = deleteAction;

    const {
      services: {
        share,
        application: { navigateToUrl, capabilities },
      },
    } = useMlKibana();

    const hasIngestPipelinesCapabilities =
      capabilities.management?.ingest?.ingest_pipelines === true;

    const { toasts } = useNotifications();
    const mlLocator = useMlLocator()!;
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
      const dataViewId = await getDataViewIdFromName(nodeLabel);

      if (dataViewId !== null) {
        const path = await mlLocator.getUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB,
          pageState: { index: dataViewId },
        });

        await navigateToPath(path);
      } else {
        toasts.addDanger(
          i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.dataViewMissingMessage', {
            defaultMessage: 'To create a job from this index create a data view for {indexTitle}.',
            values: { indexTitle: nodeLabel },
          })
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeLabel]);

    const onManagePipeline = useCallback(async () => {
      const ingestPipelineLocator = share.url.locators.get('INGEST_PIPELINES_APP_LOCATOR');
      if (ingestPipelineLocator && nodeLabel !== null) {
        const path = await ingestPipelineLocator.getUrl({
          page: 'pipeline_list',
        });

        // Passing pipelineId here because pipeline_list is not recognizing pipelineId params
        await navigateToUrl(`${path}/?pipeline=${nodeLabel}`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [share.url.locators, nodeLabel]);

    const onAnalyzeDataDrift = useCallback(async () => {
      closePopover();
      const path = await mlLocator.getUrl({
        page: ML_PAGES.DATA_DRIFT_CUSTOM,
        pageState: { comparison: nodeLabel },
      });
      await navigateToPath(path);
    }, [nodeLabel, navigateToPath, mlLocator]);

    const onCloneJobClick = useCallback(async () => {
      navigateToWizardWithClonedJob({ config: details[nodeId], stats: details[nodeId]?.stats });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    const onActionsButtonClick = () => {
      setPopover(!isPopoverOpen);
    };

    const closePopover = () => {
      setPopover(false);
    };

    // Set up Cytoscape event handlers
    useEffect(() => {
      const selectHandler: cytoscape.EventHandler = (event) => {
        const targetNode = event.target;
        if (targetNode._private.data.type === JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING) {
          toasts.addWarning(
            i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.jobMissingMessage', {
              defaultMessage: 'There is no data available for job {label}.',
              values: { label: targetNode._private.data.label },
            })
          );
          return;
        }
        setSelectedNode(targetNode);
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
    }, [cy, deselect, toasts]);

    useEffect(
      function updateElementsOnClose() {
        if ((isModalVisible === false && deleteItem === true) || didUntag === true) {
          let destIndexNode;
          if (deleteTargetIndex === true || didUntag === true) {
            const jobDetails = details[nodeId];
            const destIndex = jobDetails.dest.index;
            destIndexNode = `${destIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;
          }
          updateElements(nodeId, nodeLabel, destIndexNode);
          setShowFlyout(false);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isModalVisible, deleteItem, didUntag]
    );

    if (showFlyout === false) {
      return null;
    }

    const button = (
      <EuiButton size="s" iconType="arrowDown" iconSide="right" onClick={onActionsButtonClick}>
        <FormattedMessage
          id="xpack.ml.dataframe.analyticsMap.flyout.nodeActionsButton"
          defaultMessage="Node actions"
        />
      </EuiButton>
    );

    const items = [
      ...(nodeType === JOB_MAP_NODE_TYPES.ANALYTICS
        ? [
            <EuiContextMenuItem
              key={`${nodeId}-delete`}
              icon="trash"
              disabled={!canDeleteDataFrameAnalytics}
              onClick={() => {
                openDeleteJobCheckModal({ config: details[nodeId], stats: details[nodeId]?.stats });
              }}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.deleteJobButton"
                defaultMessage="Delete job"
              />
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={`${nodeId}-clone`}
              icon="copy"
              disabled={!canCreateDataFrameAnalytics}
              onClick={onCloneJobClick}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.cloneJobButton"
                defaultMessage="Clone job"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(nodeType === JOB_MAP_NODE_TYPES.INDEX
        ? [
            <EuiContextMenuItem
              disabled={!canCreateDataFrameAnalytics}
              key={`${nodeId}-drift-data`}
              icon="visTagCloud"
              onClick={onAnalyzeDataDrift}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.analyzeDrift"
                defaultMessage="Analyze data drift"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(nodeType === JOB_MAP_NODE_TYPES.INDEX
        ? [
            <EuiContextMenuItem
              disabled={!canCreateDataFrameAnalytics}
              key={`${nodeId}-create`}
              icon="plusInCircle"
              onClick={onCreateJobClick}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.createJobButton"
                defaultMessage="Create job from this index"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(modelId !== nodeLabel &&
      (nodeType === JOB_MAP_NODE_TYPES.ANALYTICS || nodeType === JOB_MAP_NODE_TYPES.INDEX)
        ? [
            <EuiContextMenuItem
              key={`${nodeId}-fetch-related`}
              icon="branch"
              onClick={() => {
                getNodeData({ id: nodeLabel, type: nodeType });
                if (cy) {
                  cy.elements().unselect();
                }
                setShowFlyout(false);
                setPopover(false);
              }}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.fetchRelatedNodesButton"
                defaultMessage="Fetch related nodes"
              />
            </EuiContextMenuItem>,
          ]
        : []),
      ...(modelId !== nodeLabel &&
      nodeType === JOB_MAP_NODE_TYPES.INGEST_PIPELINE &&
      hasIngestPipelinesCapabilities
        ? [
            <EuiContextMenuItem
              key={`${nodeId}-view-pipeline`}
              icon="pipelineApp"
              onClick={onManagePipeline}
            >
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.flyout.viewIngestPipelineButton"
                defaultMessage="View ingest pipeline"
              />
            </EuiContextMenuItem>,
          ]
        : []),
    ];

    return (
      <EuiPortal>
        <EuiFlyout ownFocus size="m" onClose={deselect} data-test-subj="mlAnalyticsJobMapFlyout">
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
            {nodeType !== JOB_MAP_NODE_TYPES.TRAINED_MODEL && items.length > 0 ? (
              <EuiPopover
                button={button}
                isOpen={isPopoverOpen}
                closePopover={closePopover}
                panelPaddingSize="s"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel items={items} />
              </EuiPopover>
            ) : null}
          </EuiFlyoutFooter>
        </EuiFlyout>
        {isDeleteJobCheckModalVisible && item && (
          <DeleteSpaceAwareItemCheckModal
            mlSavedObjectType={jobType}
            ids={[item.config.id]}
            onCloseCallback={closeDeleteJobCheckModal}
            canDeleteCallback={() => {
              // Item will always be set by the time we open the delete modal
              openModal(deleteAction.item!);
              closeDeleteJobCheckModal();
            }}
            refreshJobsCallback={refreshJobsCallback}
            setDidUntag={setDidUntag}
          />
        )}
        {isModalVisible && <DeleteActionModal {...deleteAction} />}
      </EuiPortal>
    );
  }
);
