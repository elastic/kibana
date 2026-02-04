/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexItem,
} from '@elastic/eui';
import React, { Fragment } from 'react';
import styled from '@emotion/styled';
import type { NodeDataDefinition } from 'cytoscape';
import type { ContentsProps } from '.';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '../../../../../common/es_fields/apm';
import type { ExternalConnectionNode } from '../../../../../common/service_map';

const ExternalResourcesList = styled.section`
  max-height: 360px;
  overflow: auto;
`;

export function ExternalsListContents({ elementData }: ContentsProps) {
  const nodeData = elementData as NodeDataDefinition;
  return (
    <EuiFlexItem>
      <ExternalResourcesList>
        <EuiDescriptionList>
          {nodeData.groupedConnections.map((resource: ExternalConnectionNode) => {
            const title = resource.label || resource[SPAN_DESTINATION_SERVICE_RESOURCE];
            // Support both Cytoscape (span.type/span.subtype) and React Flow (spanType/spanSubtype) formats
            // To be refactored when the Cytoscape is replaced.
            const spanType = resource[SPAN_TYPE] ?? resource.spanType;
            const spanSubtype = resource[SPAN_SUBTYPE] ?? resource.spanSubtype;
            const desc = spanType && spanSubtype ? `${spanType} (${spanSubtype})` : '';
            return (
              <Fragment key={resource.id}>
                <EuiDescriptionListTitle className="eui-textTruncate" title={title}>
                  {title}
                </EuiDescriptionListTitle>
                {desc && (
                  <EuiDescriptionListDescription className="eui-textTruncate" title={desc}>
                    {desc}
                  </EuiDescriptionListDescription>
                )}
              </Fragment>
            );
          })}
        </EuiDescriptionList>
      </ExternalResourcesList>
    </EuiFlexItem>
  );
}
