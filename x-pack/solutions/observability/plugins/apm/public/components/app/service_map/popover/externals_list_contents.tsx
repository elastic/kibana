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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ServiceMapNode } from '../../../../../common/service_map';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '../../../../../common/es_fields/apm';
import { isEdge, type ServiceMapSelection } from './utils';
import { isGroupedNodeData, type GroupedConnectionInfo } from '../../../../../common/service_map';

export interface ExternalsListContentsProps {
  selection: ServiceMapSelection;
}

const externalResourcesListCss = css`
  max-height: 360px;
  overflow: auto;
`;

export function ExternalsListContents({ selection }: ExternalsListContentsProps) {
  if (isEdge(selection)) {
    return null;
  }
  const node = selection as ServiceMapNode;
  if (!isGroupedNodeData(node.data)) {
    return null;
  }
  const groupedConnections = node.data.groupedConnections;
  return (
    <EuiFlexItem>
      <section
        css={externalResourcesListCss}
        aria-label={i18n.translate('xpack.apm.serviceMap.externalResourcesList.ariaLabel', {
          defaultMessage: 'External resources',
        })}
      >
        <EuiDescriptionList>
          {groupedConnections.map((resource: GroupedConnectionInfo) => {
            const title = resource.label || (resource[SPAN_DESTINATION_SERVICE_RESOURCE] ?? '');
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
      </section>
    </EuiFlexItem>
  );
}
