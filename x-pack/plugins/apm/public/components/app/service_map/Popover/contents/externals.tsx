/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
} from '@elastic/eui';
import React, { Fragment, MouseEvent } from 'react';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { ExternalConnectionNode } from '../../../../../../common/service_map';

const ExternalResourcesList = euiStyled.section`
  max-height: 360px;
  overflow: auto;
`;

interface ExternalsProps {
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  selectedNodeData: cytoscape.NodeDataDefinition;
}

export function Externals({ selectedNodeData }: ExternalsProps) {
  return (
    <EuiFlexItem>
      <ExternalResourcesList>
        <EuiDescriptionList>
          {selectedNodeData.groupedConnections.map(
            (resource: ExternalConnectionNode) => {
              const title =
                resource.label || resource['span.destination.service.resource'];
              const desc = `${resource['span.type']} (${resource['span.subtype']})`;
              return (
                <Fragment key={resource.id}>
                  <EuiDescriptionListTitle
                    className="eui-textTruncate"
                    title={title}
                  >
                    {title}
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription
                    className="eui-textTruncate"
                    title={desc}
                  >
                    {desc}
                  </EuiDescriptionListDescription>
                </Fragment>
              );
            }
          )}
        </EuiDescriptionList>
      </ExternalResourcesList>
    </EuiFlexItem>
  );
}
