/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React from 'react';
import styled from 'styled-components';
import {
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';

const ItemRow = styled.div`
  line-height: 2;
`;

const ItemTitle = styled.dt`
  color: ${({ theme }) => theme.eui.textColors.subdued};
`;

const ItemDescription = styled.dd``;

interface InfoProps extends cytoscape.NodeDataDefinition {
  type?: string;
  subtype?: string;
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

  return (
    <>
      {listItems.map(
        ({ title, description }) =>
          description && (
            <ItemRow key={title}>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription>{description}</ItemDescription>
            </ItemRow>
          )
      )}
    </>
  );
}
