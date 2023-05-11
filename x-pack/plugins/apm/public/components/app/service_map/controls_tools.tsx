/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import cytoscape from 'cytoscape';
import React, { useContext, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { EuiCodeBlock } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiTextArea } from '@elastic/eui';
import { CytoscapeContext } from '../../../context/cytoscape_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { callApmApi } from '../../../services/rest/create_call_apm_api';

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
  //  const { dataView } = useApmDataView();
  const { core } = useApmPluginContext();
  const cy = useContext(CytoscapeContext);
  const selectedNode = cy.$('node:selected');
  const isDisabled =
    selectedNode.length === 0 || !selectedNode.data('service.name');
  async function explore() {
    const cyTemp = cytoscape();
    cyTemp.add(selectedNode);
    const index = 'remote_cluster:metrics-*';
    const query = {
      controls: {
        use_significance: false,
        sample_size: 2000,
        timeout: 5000,
      },
      vertices: [
        {
          field: 'service.name',
          include: [
            {
              term: selectedNode.id(),
              boost: 0.7718299164768414,
            },
          ],
          min_doc_count: 1,
        },
      ],
      connections: {
        query: {
          bool: {
            must: [],
            filter: [
              {
                range: {
                  '@timestamp': {
                    format: 'strict_date_optional_time',
                    gte: 'now-15m',
                    lte: 'now',
                  },
                },
              },
            ],
            should: [],
            must_not: [],
          },
        },
        vertices: [
          {
            field: 'kubernetes.pod.name',
            size: 50,
            min_doc_count: 1,
          },
        ],
        connections: {
          query: {
            bool: {
              must: [],
              filter: [
                {
                  range: {
                    '@timestamp': {
                      format: 'strict_date_optional_time',
                      gte: 'now-15m',
                      lte: 'now',
                    },
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
          vertices: [
            {
              field: 'orchestrator.cluster.name',
              size: 50,
              min_doc_count: 1,
            },
            {
              field: 'kubernetes.namespace',
              size: 50,
              min_doc_count: 1,
            },
            {
              field: 'kubernetes.node.name',
              size: 50,
              min_doc_count: 1,
            },
          ],
        },
      },
    };
    // const response = {
    //   took: 3001,
    //   timed_out: false,
    //   vertices: [
    //     {
    //       field: 'kubernetes.node.name',
    //       term: 'gke-edge-oblt-edge-oblt-pool-095c801b-vcg6',
    //       weight: 0.17389830508474577,
    //       depth: 2,
    //     },
    //     {
    //       field: 'kubernetes.pod.name',
    //       term: 'opbeans-ruby-64f9d69865-dkg9f',
    //       weight: 0.95,
    //       depth: 1,
    //     },
    //     {
    //       field: 'service.name',
    //       term: 'opbeans-ruby',
    //       weight: 1,
    //       depth: 0,
    //     },
    //     {
    //       field: 'orchestrator.cluster.name',
    //       term: 'edge-oblt',
    //       weight: 0.17389830508474577,
    //       depth: 2,
    //     },
    //     {
    //       field: 'kubernetes.namespace',
    //       term: 'default',
    //       weight: 0.17389830508474577,
    //       depth: 2,
    //     },
    //   ],
    //   connections: [
    //     {
    //     data: {  source: 3,
    //       target: 2,
    //       weight: 0.95,
    //       doc_count: 575,}
    //     },
    //     {
    //       source: 2,
    //       target: 1,
    //       weight: 0.4283050847457627,
    //       doc_count: 665,
    //     },
    //     {
    //       source: 2,
    //       target: 4,
    //       weight: 0.17389830508474577,
    //       doc_count: 270,
    //     },
    //     {
    //       source: 2,
    //       target: 0,
    //       weight: 0.17389830508474577,
    //       doc_count: 270,
    //     },
    //     {
    //       source: 2,
    //       target: 5,
    //       weight: 0.17389830508474577,
    //       doc_count: 270,
    //     },
    //   ],
    // };

    const { resp } = await core.http.post('/api/graph/graphExplore', {
      body: JSON.stringify({ index, query }),
    });
    // Go through the vertices first
    resp.vertices.forEach((v) => {
      if (v.field !== 'service.name') {
        cyTemp.add({
          data: {
            id: `${v.field}:${v.term}`,
            label: v.term,
            'asset.type': v.field,
          },
        });
      }
    });

    // Now go through the added nodes and infer connections
    cyTemp.nodes().forEach((node) => {
      switch (node.data('asset.type')) {
        case 'kubernetes.node.name':
          // Nodes are children of clusters and the parents of pods
          const clusterNode = cyTemp.$(
            '[asset\\.type = "orchestrator.cluster.name"]'
          )[0];
          const source = clusterNode ?? selectedNode;

          cyTemp.add({
            data: {
              id: `${source.id()}~>${node.id()}`,
              label: `${source.id()} to ${node.id()}`,
              source: source.id(),
              target: node.id(),
            },
          });
          break;
        case 'kubernetes.pod.name':
          // pod runs on a node and connects to a service
          const kNode = cyTemp.$('[ asset\\.type = "kubernetes.node.name"]');

          if (kNode.length > 0) {
            cyTemp.add({
              data: {
                id: `${kNode.id()}~>${node.id()}`,
                label: `${kNode.id()} to ${node.id()}`,
                source: kNode.id(),
                target: node.id(),
              },
            });
          }

          cyTemp.add({
            data: {
              id: `${selectedNode.id()}~>${node.id()}`,
              label: `${selectedNode.id()} to ${node.id()}`,
              source: selectedNode.id(),
              target: node.id(),
            },
          });
          break;
        case 'kubernetes.namespace':
          // Namespace should point to the service

          cyTemp.add({
            data: {
              id: `${node.id()}~>${selectedNode.id()}`,
              label: `${node.id()} to ${selectedNode.id()}`,
              source: node.id(),
              target: selectedNode.id(),
            },
          });
          break;
        case 'orchestrator.cluster.name':
          const nsNode = cyTemp.$('[asset\\.type = "kubernetes.namespace"]')[0];
          // If we have a namespace, point to that, otherwise use the service
          if (nsNode) {
            cyTemp.add({
              data: {
                id: `${node.id()}~>${nsNode.id()}`,
                label: `${node.id()} to ${nsNode.id()}`,
                source: node.id(),
                target: nsNode.id(),
              },
            });
          } else {
            cyTemp.add({
              data: {
                id: `${node.id()}~>${selectedNode.id()}`,
                label: `${node.id()} to ${selectedNode.id()}`,
                source: node.id(),
                target: selectedNode.id(),
              },
            });
          }
          break;
        default:
          break;
      }
    });

    cyTemp.elements().forEach((el) => {
      if (cy.$id(el.id()).length === 0) {
        cy.add(el);
      }
    });
    cy.trigger('custom:data', [cyTemp.nodes()]);
    cyTemp.destroy();
  }

  const [isQueryPanelVisible, setIsQueryPanelVisible] = useState(false);
  const [editorContents, setEditorContents] = useState('');
  const [queryResponse, setQueryResponse] = useState({});

  function toggleQueryPanel() {
    setIsQueryPanelVisible(!isQueryPanelVisible);
  }
  function handleCodeEditorChange(event) {
    setEditorContents(event.target.value);
  }
  async function handleCodeEditorSubmit(event) {
    event.preventDefault();

    const resp = await callApmApi('GET /internal/apm/service-map', {
      params: {
        query: { q: editorContents },
      },
    });
    setQueryResponse(resp);
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
            isDisabled={isDisabled}
            onClick={explore}
          />
        </EuiToolTip>
      </Panel>
      <Panel hasShadow={true} paddingSize="none">
        <EuiToolTip anchorClassName="eui-displayInline" content="Query">
          <Button
            aria-label="Query"
            color="text"
            iconType="console"
            onClick={toggleQueryPanel}
          />
        </EuiToolTip>
        {isQueryPanelVisible && (
          <EuiFlyout size="s" onClose={toggleQueryPanel}>
            <EuiFlyoutHeader>
              <EuiTitle>
                <h1>Query</h1>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiText>
                Query your infrastructure using{' '}
                <EuiLink
                  data-test-subj="apmControlsToolsCnqueryLink"
                  href="https://mondoo.com/cnquery"
                >
                  cnquery
                </EuiLink>{' '}
                and{' '}
                <EuiLink
                  data-test-subj="apmControlsToolsMqlLink"
                  href="https://mondoo.com/docs/mql/resources/"
                >
                  MQL
                </EuiLink>
                .
              </EuiText>
              <EuiSpacer />
              <EuiTextArea
                data-test-subj="apmControlsToolsTextArea"
                placeholder=""
                fullWidth={true}
                onChange={handleCodeEditorChange}
                value={editorContents}
              />
              <EuiSpacer />
              <EuiButton
                data-test-subj="apmControlsToolsSubmitButton"
                onClick={handleCodeEditorSubmit}
              >
                Submit
              </EuiButton>
              <EuiSpacer />
              <EuiCodeBlock>
                {JSON.stringify(queryResponse, null, 2)}
              </EuiCodeBlock>
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </Panel>
    </ControlsContainer>
  );
}
