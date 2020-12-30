/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// The ui had different columns in different order depending on the
// $scope.view variable. This provides a lookup for the column headers

import { i18n } from '@kbn/i18n';

export const labels = {
  // "index detail" page shows nodes on which index shards are allocated
  index: [
    {
      content: i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.labels.nodesLabel', {
        defaultMessage: 'Nodes',
      }),
    },
  ],
  indexWithUnassigned: [
    {
      content: i18n.translate(
        'xpack.monitoring.elasticsearch.shardAllocation.labels.unassignedLabel',
        {
          defaultMessage: 'Unassigned',
        }
      ),
    },
    {
      content: i18n.translate(
        'xpack.monitoring.elasticsearch.shardAllocation.labels.unassignedNodesLabel',
        {
          defaultMessage: 'Nodes',
        }
      ),
    },
  ],
  // "node detail" page shows the indexes that have shards on this node
  node: [
    {
      content: i18n.translate(
        'xpack.monitoring.elasticsearch.shardAllocation.labels.indicesLabel',
        {
          defaultMessage: 'Indices',
        }
      ),
      showToggleSystemIndicesComponent: true, // tell the TableHead component to inject checkbox JSX to show/hide system indices
    },
  ],
};
