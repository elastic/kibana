/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { DefaultFieldRenderer } from '../../field_renderers/default_renderer';
import type { ManagedUsersTableColumns, ManagedUserTable } from './types';
import * as i18n from './translations';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';

const fieldColumn: EuiBasicTableColumn<ManagedUserTable> = {
  name: i18n.FIELD_COLUMN_TITLE,
  field: 'label',
  render: (label: string, { field }) => (
    <span
      css={css`
        font-weight: ${euiThemeVars.euiFontWeightMedium};
        color: ${euiThemeVars.euiTitleColor};
      `}
    >
      {label ?? field}
    </span>
  ),
};

export const getManagedUserTableColumns = (
  contextID: string,
  isDraggable: boolean
): ManagedUsersTableColumns => [
  fieldColumn,
  {
    name: i18n.VALUES_COLUMN_TITLE,
    field: 'value',
    render: (value: ManagedUserTable['value'], { field }) => {
      return field && value ? (
        <DefaultFieldRenderer
          rowItems={value.map((v) => value.toString())}
          attrName={field}
          idPrefix={contextID ? `managedUser-${contextID}` : 'managedUser'}
          isDraggable={isDraggable}
        />
      ) : (
        defaultToEmptyTag(value)
      );
    },
  },
];
