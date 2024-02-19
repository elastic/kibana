/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { euiLightVars } from '@kbn/ui-theme';
import { FormattedMessage } from '@kbn/i18n-react';
import { DefaultFieldRenderer } from '../../../../../timelines/components/field_renderers/field_renderers';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { getSourcererScopeId } from '../../../../../helpers';
import type { BasicEntityData, EntityTableColumns } from './types';

export const getEntityTableColumns = <T extends BasicEntityData>(
  contextID: string,
  scopeId: string,
  isDraggable: boolean,
  data: T
): EntityTableColumns<T> => [
  {
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.fieldColumnTitle"
        defaultMessage="Field"
      />
    ),
    field: 'label',
    render: (label: string, { field }) => (
      <span
        data-test-subj="entity-table-label"
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
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.valuesColumnTitle"
        defaultMessage="Values"
      />
    ),
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
            data-test-subj="entity-table-value"
          />
        );
      }

      if (render) {
        return render(data);
      }

      return getEmptyTagValue();
    },
  },
];
