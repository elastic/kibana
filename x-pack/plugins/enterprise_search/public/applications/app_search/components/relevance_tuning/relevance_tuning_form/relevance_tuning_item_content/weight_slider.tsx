/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRange } from '@elastic/eui';
import { useActions } from 'kea';

import { i18n } from '@kbn/i18n';

import { SearchField } from '../../types';
import { RelevanceTuningLogic } from '../../relevance_tuning_logic';

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
        showInput={true}
        compressed={true}
        fullWidth={true}
      />
    </EuiFormRow>
  );
};
