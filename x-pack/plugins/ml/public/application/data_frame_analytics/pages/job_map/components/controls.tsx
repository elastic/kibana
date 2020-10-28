/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useContext, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
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
import { CytoscapeContext } from './cytoscape';
import { JOB_MAP_NODE_TYPES } from '../../../../../../common/constants/data_frame_analytics';
import { DeleteButton } from './delete_button';

interface Props {
  analyticsId: string;
  details: any;
  getNodeData: any;
}

// TODO move list items to shared place as we use them in the details bit of the wizard
export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

function getListItems(details: object): ListItems[] {
  return Object.entries(details).map(([key, value]) => ({
    title: key,
    description: typeof value === 'object' ? JSON.stringify(value, null, 2) : value,
  }));
}

export const Controls: FC<Props> = ({ analyticsId, details, getNodeData }) => {
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<cytoscape.NodeSingular | undefined>(undefined);

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

  // Set up Cytoscape event handlers
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = (event) => {
      setSelectedNode(event.target);
      setShowFlyout(true);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', deselect);
      // cy.on('data viewport', deselect);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
        // cy.removeListener('data viewport', undefined, deselect);
      }
    };
  }, [cy, deselect]);

  if (showFlyout === false) {
    return null;
  }

  const nodeDataButton =
    analyticsId !== nodeLabel && nodeType === JOB_MAP_NODE_TYPES.ANALYTICS ? (
      <EuiButtonEmpty
        onClick={() => {
          getNodeData(nodeLabel);
          setShowFlyout(false);
        }}
        iconType="branch"
      >
        {i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.fetchRelatedNodesButton', {
          defaultMessage: 'Fetch related nodes',
        })}
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
                  {i18n.translate('xpack.ml.dataframe.analyticsMap.flyoutHeaderTitle', {
                    defaultMessage: 'Details for {type} {id}',
                    values: { id: nodeLabel, type: nodeType },
                  })}
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
            <EuiFlexItem grow={false}>
              <DeleteButton id={nodeLabel} type={nodeType} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
