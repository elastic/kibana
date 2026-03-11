/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionListDescription, EuiDescriptionListTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { isEdge } from './utils';
import type { ContentsProps } from './popover_content';
import { isDependencyNodeData, type DependencyNodeData } from '../../../../../common/service_map';

const itemRowStyles = css`
  line-height: 2;
`;

export function ResourceContents({ selection }: ContentsProps) {
  const { euiTheme } = useEuiTheme();

  const subduedDescriptionListTitleStyles = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  if (isEdge(selection)) {
    return null;
  }
  const node = selection;
  if (!isDependencyNodeData(node.data)) {
    return null;
  }
  const data: DependencyNodeData = node.data;

  const listItems = [
    {
      title: i18n.translate('xpack.apm.serviceMap.typePopoverStat', {
        defaultMessage: 'Type',
      }),
      description: data.spanType || NOT_AVAILABLE_LABEL,
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.subtypePopoverStat', {
        defaultMessage: 'Subtype',
      }),
      description: data.spanSubtype || NOT_AVAILABLE_LABEL,
    },
  ];

  return (
    <>
      {listItems.map(
        ({ title, description }) =>
          description && (
            <div key={title}>
              <div css={itemRowStyles}>
                <EuiDescriptionListTitle css={subduedDescriptionListTitleStyles}>
                  {title}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
              </div>
            </div>
          )
      )}
    </>
  );
}
