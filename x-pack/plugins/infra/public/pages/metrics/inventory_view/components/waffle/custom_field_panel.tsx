/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiComboBox, EuiForm, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { InfraGroupByOptions } from '../../../../../lib/lib';
import { DerivedIndexPattern } from '../../../../../containers/metrics_source';
interface Props {
  onSubmit: (field: string) => void;
  fields: DerivedIndexPattern['fields'];
  currentOptions: InfraGroupByOptions[];
}

interface SelectedOption {
  label: string;
}

const initialState = {
  selectedOptions: [] as SelectedOption[],
};

type State = Readonly<typeof initialState>;

export class CustomFieldPanel extends React.PureComponent<Props, State> {
  public static displayName = 'CustomFieldPanel';
  public readonly state: State = initialState;
  public render() {
    const { fields, currentOptions } = this.props;
    const options = fields
      .filter(
        (f) =>
          f.aggregatable &&
          f.type === 'string' &&
          !(currentOptions && currentOptions.some((o) => o.field === f.name))
      )
      .map((f) => ({ label: f.name }));
    const isSubmitDisabled = !this.state.selectedOptions.length;
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
              selectedOptions={this.state.selectedOptions}
              options={options}
              onChange={this.handleFieldSelection}
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
            onClick={this.handleSubmit}
          >
            Add
          </EuiButton>
        </EuiForm>
      </div>
    );
  }
  private handleSubmit = () => {
    this.props.onSubmit(this.state.selectedOptions[0].label);
  };

  private handleFieldSelection = (selectedOptions: SelectedOption[]) => {
    this.setState({ selectedOptions });
  };
}
