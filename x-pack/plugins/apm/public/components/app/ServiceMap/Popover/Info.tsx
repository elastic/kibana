/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import {
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { ExternalConnectionNode } from '../../../../../common/service_map';

const ItemRow = styled.div`
  line-height: 2;
`;

const SubduedDescriptionListTitle = styled(EuiDescriptionListTitle)`
  &&& {
    color: ${({ theme }) => theme.eui.textColors.subdued};
  }
`;

const ExternalResourcesList = styled.section`
  max-height: 360px;
  overflow: auto;
`;

interface InfoProps extends cytoscape.NodeDataDefinition {
  type?: string;
  subtype?: string;
  className?: string;
}

export function Info(data: InfoProps) {
  // For nodes with span.type "db", convert it to "database".
  // Otherwise leave it as-is.
  const type = data[SPAN_TYPE] === 'db' ? 'database' : data[SPAN_TYPE];

  // Externals should not have a subtype so make it undefined if the type is external.
  const subtype = data[SPAN_TYPE] !== 'external' && data[SPAN_SUBTYPE];

  const listItems = [
    {
      title: i18n.translate('xpack.apm.serviceMap.typePopoverStat', {
        defaultMessage: 'Type',
      }),
      description: type,
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.subtypePopoverStat', {
        defaultMessage: 'Subtype',
      }),
      description: subtype,
    },
  ];

  if (data.groupedConnections) {
    return (
      <ExternalResourcesList>
        <EuiDescriptionList>
          {data.groupedConnections.map((resource: ExternalConnectionNode) => {
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
          })}
        </EuiDescriptionList>
      </ExternalResourcesList>
    );
  }

  return (
    <>
      {listItems.map(
        ({ title, description }) =>
          description && (
            <div key={title}>
              <ItemRow>
                <SubduedDescriptionListTitle>
                  {title}
                </SubduedDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {description}
                </EuiDescriptionListDescription>
              </ItemRow>
            </div>
          )
      )}
    </>
  );
}
