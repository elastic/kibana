/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiComboBox, EuiForm, EuiFormRow } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { InfraIndexField } from 'x-pack/plugins/infra/server/graphql/types';
interface Props {
  onSubmit: (field: string) => void;
  fields: InfraIndexField[];
  intl: InjectedIntl;
}

interface SelectedOption {
  label: string;
}

const initialState = {
  selectedOptions: [] as SelectedOption[],
};

type State = Readonly<typeof initialState>;

export const CustomFieldPanel = injectI18n(
  class extends React.PureComponent<Props, State> {
    public static displayName = 'CustomFieldPanel';
    public readonly state: State = initialState;
    public render() {
      const options = this.props.fields
        .filter(f => f.aggregatable && f.type === 'string')
        .map(f => ({ label: f.name }));
      return (
        <div style={{ padding: 16 }}>
          <EuiForm>
            <EuiFormRow
              label="Field"
              helpText="This is the field used for the terms aggregation"
              compressed
            >
              <EuiComboBox
                placeholder="Select one field"
                singleSelection={{ asPlainText: true }}
                selectedOptions={this.state.selectedOptions}
                options={options}
                onChange={this.handleFieldSelection}
                isClearable={false}
              />
            </EuiFormRow>
            <EuiButton type="submit" size="s" fill onClick={this.handleSubmit}>
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
);
