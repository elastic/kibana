/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiComboBox, EuiForm, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';
import { InfraGroupByOptions } from '../../../../../common/inventory/types';
interface Props {
  onSubmit: (field: string) => void;
  currentOptions: InfraGroupByOptions[];
}

interface SelectedOption {
  label: string;
}

export const CustomFieldPanel = ({ onSubmit, currentOptions }: Props) => {
  const { metricsView } = useMetricsDataViewContext();
  const [selectedOptions, setSelectedOptions] = React.useState<SelectedOption[]>([]);

  const handleSubmit = () => {
    onSubmit(selectedOptions[0].label);
  };

  const handleFieldSelection = (newSelection: SelectedOption[]) => {
    setSelectedOptions(newSelection);
  };

  const options = (metricsView?.fields ?? [])
    .filter(
      (f) =>
        f.aggregatable &&
        f.type === 'string' &&
        !(currentOptions && currentOptions.some((o) => o.field === f.name))
    )
    .map((f) => ({ label: f.name }));

  const isSubmitDisabled = !selectedOptions.length;
  return (
    <div style={{ padding: 16 }}>
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.infra.waffle.customGroupByFieldLabel', {
            defaultMessage: 'Field',
          })}
          helpText={i18n.translate('xpack.infra.waffle.customGroupByHelpText', {
            defaultMessage: 'This is the field used for the terms aggregation',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiComboBox
            data-test-subj="groupByCustomField"
            placeholder={i18n.translate('xpack.infra.waffle.customGroupByDropdownPlacehoder', {
              defaultMessage: 'Select one',
            })}
            singleSelection={{ asPlainText: true }}
            selectedOptions={selectedOptions}
            options={options}
            onChange={handleFieldSelection}
            fullWidth
            isClearable={false}
          />
        </EuiFormRow>
        <EuiButton
          data-test-subj="groupByCustomFieldAddButton"
          disabled={isSubmitDisabled}
          type="submit"
          size="s"
          fill
          onClick={handleSubmit}
        >
          {i18n.translate('xpack.infra..addButtonLabel', { defaultMessage: 'Add' })}
        </EuiButton>
      </EuiForm>
    </div>
  );
};
