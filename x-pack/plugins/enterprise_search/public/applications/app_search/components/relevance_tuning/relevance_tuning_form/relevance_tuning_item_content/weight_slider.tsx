/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiFormRow, EuiRange } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { RelevanceTuningLogic } from '../../relevance_tuning_logic';
import { SearchField } from '../../types';

interface Props {
  name: string;
  field: SearchField;
}

export const WeightSlider: React.FC<Props> = ({ name, field }) => {
  const { updateFieldWeight } = useActions(RelevanceTuningLogic);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.manageFields.weight.label',
        {
          defaultMessage: 'Weight',
        }
      )}
    >
      <EuiRange
        min={0}
        max={10}
        step={0.1}
        value={field.weight}
        onChange={(e) =>
          updateFieldWeight(
            name,
            parseFloat((e as React.ChangeEvent<HTMLInputElement>).target.value)
          )
        }
        showInput
        compressed
        fullWidth
      />
    </EuiFormRow>
  );
};
