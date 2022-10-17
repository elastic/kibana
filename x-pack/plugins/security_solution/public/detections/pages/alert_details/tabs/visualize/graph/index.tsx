/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { GraphVisualization } from '@kbn/graph-plugin/public/components/graph_visualization';
import { createWorkspace } from '@kbn/graph-plugin/public/services/workspace';
import type { Workspace } from '@kbn/graph-plugin/public/types';
import { useGraphQuery } from './use-graph-query';

// const nodes = [
//   {
//     id: '1',
//     color: 'black',
//     data: {
//       field: 'A',
//       term: '1',
//     },
//     icon: {
//       class: 'a',
//       code: 'a',
//       label: '',
//     },
//     isSelected: true,
//     kx: 5,
//     ky: 5,
//     label: '1',
//     numChildren: 1,
//     parent: null,
//     scaledSize: 10,
//     x: 5,
//     y: 5,
//   },
//   {
//     id: '2',
//     color: 'red',
//     data: {
//       field: 'B',
//       term: '2',
//     },
//     icon: {
//       class: 'b',
//       code: 'b',
//       label: '',
//     },
//     isSelected: false,
//     kx: 7,
//     ky: 9,
//     label: '2',
//     numChildren: 0,
//     parent: null,
//     scaledSize: 10,
//     x: 7,
//     y: 9,
//   },
//   {
//     id: '3',
//     color: 'yellow',
//     data: {
//       field: 'C',
//       term: '3',
//     },
//     icon: {
//       class: 'c',
//       code: 'c',
//       label: '',
//     },
//     isSelected: false,
//     kx: 12,
//     ky: 2,
//     label: '3',
//     numChildren: 0,
//     parent: null,
//     scaledSize: 10,
//     x: 7,
//     y: 9,
//   },
// ];
// const edges = [
//   {
//     isSelected: true,
//     label: '',
//     topSrc: nodes[0],
//     topTarget: nodes[1],
//     source: nodes[0],
//     target: nodes[1],
//     weight: 10,
//     width: 2,
//   },
//   {
//     isSelected: true,
//     label: '',
//     topSrc: nodes[1],
//     topTarget: nodes[2],
//     source: nodes[1],
//     target: nodes[2],
//     weight: 10,
//     width: 2.2,
//   },
// ];
// const workspace = {
//   nodes,
//   edges,
//   selectNone: () => {},
//   changeHandler: () => {},
//   toggleNodeSelection: (node) => {
//     return !node.isSelected;
//   },
//   getAllIntersections: () => {},
//   removeEdgeFromSelection: () => {},
//   addEdgeToSelection: () => {},
//   getEdgeSelection: () => {},
//   clearEdgeSelection: () => {},
// };

export const AlertDetailsVisualizeGraph = React.memo(({ id }: { id: string }) => {
  const getGraph = useGraphQuery(id);
  const workspaceRef = useRef<Workspace>();
  const [ranLayout, updateRanLayout] = useState(false);
  const [renderCounter, setRenderCounter] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workspaceRef.current) {
      workspaceRef.current = createWorkspace({
        indexName: '.alerts-security.alerts-default',
        vertex_fields: [
          {
            selected: false,
            color: 'red',
            name: 'kibana.alert.uuid',
            type: 'string',
            icon: {
              class: 'fa-triangle-exclamation',
              code: '\uf071',
              label: 'Alert',
            },
            aggregatable: true,
          },
          {
            selected: false,
            color: 'blue',
            name: 'host.name',
            type: 'string',
            icon: {
              class: 'fa-laptop',
              code: '\uf109',
              label: 'Host',
            },
            aggregatable: true,
          },
          {
            selected: false,
            color: 'brown',
            name: 'kibana.alert.rule.name',
            type: 'string',
            icon: {
              class: 'fa-folder-open',
              code: '\uf07c',
              label: 'Host',
            },
            aggregatable: true,
          },
          {
            selected: false,
            color: 'gray',
            name: 'user.name',
            type: 'string',
            icon: {
              class: 'fa-user',
              code: '\uf007',
              label: 'User',
            },
            aggregatable: true,
          },
        ],
        // Here we have the opportunity to look up labels for nodes...
        nodeLabeller() {
          // console.log(newNodes);
        },
        changeHandler: () => setRenderCounter((cur) => cur + 1),
        graphExploreProxy: getGraph,
        exploreControls: {
          useSignificance: false,
          sampleSize: 2000,
          timeoutMillis: 5000,
          sampleDiversityField: null,
          maxValuesPerDoc: 1,
          minDocCount: 1,
        },
      });
    }
  }, [getGraph]);

  useEffect(() => {
    if (workspaceRef.current && !loaded) {
      workspaceRef.current.callElasticsearch({});
      setLoaded(true);
      workspaceRef.current.runLayout();
    }
  }, [loaded]);

  useEffect(() => {
    if (loaded && workspaceRef.current && workspaceRef.current?.nodes.length > 0 && !ranLayout) {
      workspaceRef.current.runLayout();
      updateRanLayout(true);
    }
  }, [loaded, ranLayout]);

  return workspaceRef.current && loaded ? (
    <div style={{ height: '100%' }}>
      <GraphVisualization
        workspace={workspaceRef.current}
        renderCounter={renderCounter} // This is only used to force a re-render
        selectSelected={() => {}}
        onSetControl={() => {}}
        onSetMergeCandidates={() => {}}
      />
    </div>
  ) : (
    <>{'Testing'}</>
  );
});

AlertDetailsVisualizeGraph.displayName = 'AlertDetailsVisualizeGraph';
