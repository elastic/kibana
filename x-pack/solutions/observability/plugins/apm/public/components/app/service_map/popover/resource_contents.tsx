/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionListDescription, EuiDescriptionListTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from '@emotion/styled';
import type { ContentsProps } from './popover_content';
import { isDependencyNodeData, type DependencyNodeData } from '../../../../../common/service_map';
import { SPAN_SUBTYPE, SPAN_TYPE } from '../../../../../common/es_fields/apm';

const ItemRow = styled.div`
  line-height: 2;
`;

const SubduedDescriptionListTitle = styled(EuiDescriptionListTitle)`
  &&& {
    color: ${({ theme }) => theme.euiTheme.colors.textSubdued};
  }
`;

export function ResourceContents({ selection }: ContentsProps) {
  if ('source' in selection && 'target' in selection) {
    return null;
  }
  const node = selection;
  if (!isDependencyNodeData(node.data)) {
    return null;
  }
  const data: DependencyNodeData = node.data;
  const subtype = data.spanSubtype ?? data[SPAN_SUBTYPE];
  const type = data.spanType ?? data[SPAN_TYPE];

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
            <div key={title}>
              <ItemRow>
                <SubduedDescriptionListTitle>{title}</SubduedDescriptionListTitle>
                <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
              </ItemRow>
            </div>
          )
      )}
    </>
  );
}
