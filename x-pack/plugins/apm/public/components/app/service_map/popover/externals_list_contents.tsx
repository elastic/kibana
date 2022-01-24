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
import { ContentsProps } from '.';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { ExternalConnectionNode } from '../../../../../common/service_map';

const ExternalResourcesList = euiStyled.section`
  max-height: 360px;
  overflow: auto;
`;

export function ExternalsListContents({ nodeData }: ContentsProps) {
  return (
    <EuiFlexItem>
      <ExternalResourcesList>
        <EuiDescriptionList>
          {nodeData.groupedConnections.map(
            (resource: ExternalConnectionNode) => {
              const title =
                resource.label || resource[SPAN_DESTINATION_SERVICE_RESOURCE];
              const desc = `${resource[SPAN_TYPE]} (${resource[SPAN_SUBTYPE]})`;
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
