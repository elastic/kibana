/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiSelect } from '@elastic/eui';
import { idxToAlphabeticalLabel } from '../../../../common/utils/index_to_alphabetical_label';

type Conditions = Array<Record<string, any>>;

export const useConditionSelector = (conditions?: Conditions) => {
  const [selectedConditionId, setSelectedConditionId] = useState<number>(0);
  useEffect(() => {
    if (!conditions) return;
    if (selectedConditionId > 0 && selectedConditionId > conditions.length - 1) {
      setSelectedConditionId(Math.max(0, conditions.length - 1));
    }
  }, [conditions, selectedConditionId]);

  return [selectedConditionId, setSelectedConditionId] as [
    number,
    React.Dispatch<React.SetStateAction<number>>
  ];
};

export const ConditionCharts: React.FC<{
  selectedConditionId: number;
  setSelectedConditionId: (id: number) => void;
  conditions?: Conditions;
  expressionChart: (id: number) => React.ReactNode;
}> = ({ selectedConditionId, setSelectedConditionId, conditions, expressionChart }) => {
  if (!conditions) return null;
  return (
    <>
      {conditions.length > 1 && (
        <ConditionSelector
          conditions={conditions}
          idSelected={selectedConditionId}
          onChange={setSelectedConditionId}
        />
      )}
      {conditions[selectedConditionId] && expressionChart(selectedConditionId)}
    </>
  );
};

const ConditionSelector = ({
  conditions,
  idSelected,
  onChange,
}: {
  conditions: Conditions;
  idSelected: number;
  onChange: (id: number) => void;
}) => {
  if (conditions.length === 1) return null;
  const conditionLabel = (label: string) =>
    i18n.translate('xpack.infra.metrics.alertFlyout.conditionLabelFullLength', {
      defaultMessage: 'Condition {label}',
      values: { label },
    });
  if (conditions.length < 6)
    return (
      <EuiButtonGroup
        options={conditions.map((_, idx) => ({
          id: `condition-preview-${idx}`,
          label: conditionLabel(idxToAlphabeticalLabel(idx)),
        }))}
        idSelected={`condition-preview-${idSelected}`}
        onChange={(id) => onChange(Number(id.replace('condition-preview-', '')))}
      />
    );
  return (
    <EuiSelect
      id="select-condition-preview"
      options={conditions.map((_, idx) => ({
        value: idx,
        text: conditionLabel(idxToAlphabeticalLabel(idx)),
      }))}
      value={idSelected}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
};
