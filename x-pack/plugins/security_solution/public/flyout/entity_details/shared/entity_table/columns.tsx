/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { euiLightVars } from '@kbn/ui-theme';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/field_renderers';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import * as i18n from '../../../../timelines/components/side_panel/new_host_detail/translations';
import { getSourcererScopeId } from '../../../../helpers';
import type { BasicEntityData, EntityTableColumns } from './types';

export const getEntityTableColumns = <T extends BasicEntityData>(
  contextID: string,
  scopeId: string,
  isDraggable: boolean,
  data: T
): EntityTableColumns<T> => [
  {
    name: i18n.FIELD_COLUMN_TITLE,
    field: 'label',
    render: (label: string, { field }) => (
      <span
        css={css`
          font-weight: ${euiLightVars.euiFontWeightMedium};
          color: ${euiLightVars.euiTitleColor};
        `}
      >
        {label ?? field}
      </span>
    ),
  },
  {
    name: i18n.VALUES_COLUMN_TITLE,
    field: 'field',
    render: (field: string | undefined, { getValues, render, renderField }) => {
      const values = getValues && getValues(data);

      if (field) {
        return (
          <DefaultFieldRenderer
            rowItems={values}
            attrName={field}
            idPrefix={contextID ? `entityTable-${contextID}` : 'entityTable'}
            isDraggable={isDraggable}
            sourcererScopeId={getSourcererScopeId(scopeId)}
            render={renderField}
          />
        );
      }

      if (render) return render(data);

      return getEmptyTagValue();
    },
  },
];
