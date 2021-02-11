/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { TEXT } from '../../../../../shared/constants/field_types';
import { SchemaTypes } from '../../../../../shared/types';

import { RelevanceTuningLogic } from '../../relevance_tuning_logic';
import { SearchField } from '../../types';

interface Props {
  name: string;
  type: SchemaTypes;
  field?: SearchField;
}

export const TextSearchToggle: React.FC<Props> = ({ name, type, field }) => {
  const { toggleSearchField } = useActions(RelevanceTuningLogic);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.manageFields.textSearch.rowLabel',
        {
          defaultMessage: 'Text search',
        }
      )}
    >
      <EuiSwitch
        label={
          type !== TEXT
            ? i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.manageFields.textSearch.warningLabel',
                {
                  defaultMessage: 'Search can only be enabled on text fields',
                }
              )
            : i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.manageFields.textSearch.descriptionLabel',
                {
                  defaultMessage: 'Search this field',
                }
              )
        }
        onChange={() => type === TEXT && toggleSearchField(name, !!field)}
        checked={!!field}
        disabled={type !== TEXT}
      />
    </EuiFormRow>
  );
};
