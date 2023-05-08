/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import React, { useContext } from 'react';
import { CytoscapeContext } from '../../../context/cytoscape_context';
import { useApmDataView } from '../../../hooks/use_apm_data_view';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { IEsSearchRequest } from '../../../../../../../src/plugins/data/public';

const ControlsContainer = euiStyled('div')`
  right: ${({ theme }) => theme.eui.euiSize};
  position: absolute;
  top: ${({ theme }) => theme.eui.euiSizeS};
  z-index: 1; /* The element containing the cytoscape canvas has z-index = 0. */
`;

const Button = euiStyled(EuiButtonIcon)`
  display: block;
  margin: ${({ theme }) => theme.eui.euiSizeXS};
`;

const Panel = euiStyled(EuiPanel)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
`;

export function ControlsTools() {
  const { dataView } = useApmDataView();
  const { data } = useApmPluginContext();
  const cy = useContext(CytoscapeContext);
  const selectedNode = cy.$('node:selected');
  const isNodeSelected = selectedNode.length === 1;

  function explore() {
    const response = {
      took: 3001,
      timed_out: false,
      vertices: [
        {
          field: 'kubernetes.node.name',
          term: 'gke-edge-oblt-edge-oblt-pool-095c801b-vcg6',
          weight: 0.17389830508474577,
          depth: 2,
        },
        {
          field: 'container.id',
          term: 'c0585cf4d4b4c86225f42a784ee6901c34e66f2d261b05225a0051258974c2c5',
          weight: 0.4283050847457627,
          depth: 2,
        },
        {
          field: 'kubernetes.pod.name',
          term: 'opbeans-ruby-64f9d69865-dkg9f',
          weight: 0.95,
          depth: 1,
        },
        {
          field: 'service.name',
          term: 'opbeans-ruby',
          weight: 1,
          depth: 0,
        },
        {
          field: 'orchestrator.cluster.name',
          term: 'edge-oblt',
          weight: 0.17389830508474577,
          depth: 2,
        },
        {
          field: 'kubernetes.namespace',
          term: 'default',
          weight: 0.17389830508474577,
          depth: 2,
        },
      ],
      connections: [
        {
          source: 3,
          target: 2,
          weight: 0.95,
          doc_count: 575,
        },
        {
          source: 2,
          target: 1,
          weight: 0.4283050847457627,
          doc_count: 665,
        },
        {
          source: 2,
          target: 4,
          weight: 0.17389830508474577,
          doc_count: 270,
        },
        {
          source: 2,
          target: 0,
          weight: 0.17389830508474577,
          doc_count: 270,
        },
        {
          source: 2,
          target: 5,
          weight: 0.17389830508474577,
          doc_count: 270,
        },
      ],
    };

    const addedNodes = [];
    response.vertices.forEach((v) => {
      switch (v.field) {
        case 'kubernetes.namespace':
          addedNodes.push(
            cy.add([
              {
                data: {
                  id: v.term,
                  label: v.term,
                  'asset.type': 'kubernetes.namespace',
                },
              },
              {
                data: {
                  id: `${v.term}->${selectedNode.id()}`,
                  source: v.term,
                  target: selectedNode.id(),
                },
              },
            ])
          );
        case 'kubernetes.node.name':
          addedNodes.push(
            cy.add([
              {
                data: {
                  id: v.term,
                  label: v.term,
                  'asset.type': 'kubernetes.node',
                },
              },
              {
                data: {
                  id: `${selectedNode.id()}->${v.term}`,
                  source: selectedNode.id(),
                  target: v.term,
                },
              },
            ])
          );
        case 'orchestrator.cluster.name':
          addedNodes.push(
            cy.add([
              {
                data: {
                  id: v.term,
                  label: v.term,
                  'asset.type': 'orchestrator.cluster.name',
                },
              },
              {
                data: {
                  id: `${selectedNode.id()}->${v.term}`,
                  source: selectedNode.id(),
                  target: v.term,
                },
              },
            ])
          );
        default:
          break;
      }
    });
    cy.trigger('custom:data', addedNodes);
  }

  return (
    <ControlsContainer>
      <Panel hasShadow={true} paddingSize="none">
        <EuiToolTip
          anchorClassName="eui-displayInline"
          content="Find related assets"
        >
          <Button
            aria-label="Find related assets"
            color="text"
            iconType="cluster"
            isDisabled={!isNodeSelected}
            onClick={explore}
          />
        </EuiToolTip>
      </Panel>
    </ControlsContainer>
  );
}
