/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import { ChipWithPopover } from '../common/popover_chip';
import * as constants from '../../../common/constants';
import { getUnformattedResourceFields } from '../../utils/resource';
import { LogDocument } from '../../../common/document';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

export const Resource = ({ row }: DataGridCellValueElementProps) => {
  const resourceDoc = getUnformattedResourceFields(row as LogDocument);
  return (
    <div>
      {(resourceDoc[constants.SERVICE_NAME_FIELD] as string) && (
        <ChipWithPopover
          property={constants.SERVICE_NAME_FIELD}
          text={resourceDoc[constants.SERVICE_NAME_FIELD] as string}
          rightSideIcon="arrowDown"
          leftSideIcon={
            resourceDoc[constants.AGENT_NAME_FIELD] && (
              <AgentIcon
                agentName={resourceDoc[constants.AGENT_NAME_FIELD] as AgentName}
                size="m"
              />
            )
          }
        />
      )}
      {resourceDoc[constants.CONTAINER_NAME_FIELD] && (
        <ChipWithPopover
          property={constants.CONTAINER_NAME_FIELD}
          text={resourceDoc[constants.CONTAINER_NAME_FIELD] as string}
          rightSideIcon="arrowDown"
        />
      )}
      {resourceDoc[constants.HOST_NAME_FIELD] && (
        <ChipWithPopover
          property={constants.HOST_NAME_FIELD}
          text={resourceDoc[constants.HOST_NAME_FIELD]}
          rightSideIcon="arrowDown"
        />
      )}
      {resourceDoc[constants.ORCHESTRATOR_NAMESPACE_FIELD] && (
        <ChipWithPopover
          property={constants.ORCHESTRATOR_NAMESPACE_FIELD}
          text={resourceDoc[constants.ORCHESTRATOR_NAMESPACE_FIELD] as string}
          rightSideIcon="arrowDown"
        />
      )}
      {resourceDoc[constants.CLOUD_INSTANCE_ID_FIELD] && (
        <ChipWithPopover
          property={constants.CLOUD_INSTANCE_ID_FIELD}
          text={resourceDoc[constants.CLOUD_INSTANCE_ID_FIELD] as string}
          rightSideIcon="arrowDown"
        />
      )}
    </div>
  );
};
