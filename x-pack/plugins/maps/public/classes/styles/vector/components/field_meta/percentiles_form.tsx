/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { EuiButton, EuiFieldNumber, EuiFormRow, EuiSpacer, EuiTextAlign } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { RowActionButtons } from '../row_action_buttons';

interface Props {
  initialPercentiles: number[];
  onChange: (percentiles: number[]) => void;
}

interface State {
  percentiles: Array<number | string>;
}

function isInvalidPercentile(percentile: unknown) {
  if (typeof percentile !== 'number') {
    return true;
  }

  return percentile <= 0 || percentile >= 100;
}

export class PercentilesForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      percentiles: props.initialPercentiles,
    };
  }

  _onSubmit = () => {
    this.props.onChange(this.state.percentiles);
  };

  render() {
    const rows = this.state.percentiles.map((percentile: number, index: number) => {
      const onAdd = () => {
        let delta = 25;
        if (index === this.state.percentiles.length - 1) {
          // Adding row to end of list.
          if (index !== 0) {
            const prevPercentile = this.state.percentiles[index - 1];
            delta = percentile - prevPercentile;
          }
        } else {
          // Adding row in middle of list.
          const nextPercentile = this.state.percentiles[index + 1];
          delta = (nextPercentile - percentile) / 2;
        }
        const newPercentile = percentile + delta;
        const percentiles = [
          ...this.state.percentiles.slice(0, index + 1),
          newPercentile,
          ...this.state.percentiles.slice(index + 1),
        ];
        this.setState({ percentiles });
      };

      const onRemove = () => {
        const percentiles =
          this.state.percentiles.length === 1
            ? this.state.percentiles
            : [
                ...this.state.percentiles.slice(0, index),
                ...this.state.percentiles.slice(index + 1),
              ];
        this.setState({ percentiles });
      };

      const onPercentileChange = (e: ChangeEvent) => {
        const sanitizedValue = parseFloat(event.target.value);
        const newPercentile = isNaN(sanitizedValue) ? '' : sanitizedValue;
        const percentiles = [...this.state.percentiles];
        percentiles[index] = isNaN(sanitizedValue) ? '' : sanitizedValue;
        this.setState({ percentiles });
      };

      const isInvalid = isInvalidPercentile(percentile);
      const error = isInvalid
        ? i18n.translate('xpack.maps.styles.invalidPercentileMsg', {
            defaultMessage: `Percentile must be a number between 0 and 100`,
          })
        : null;

      return (
        <EuiFormRow key={index} display="rowCompressed" isInvalid={isInvalid} error={error}>
          <EuiFieldNumber
            isInvalid={isInvalid}
            value={percentile}
            onChange={onPercentileChange}
            append={
              <RowActionButtons
                onAdd={onAdd}
                onRemove={onRemove}
                showDeleteButton={this.state.percentiles.length > 1}
              />
            }
            compressed
          />
        </EuiFormRow>
      );
    });

    const applyButton = !_.isEqual(this.state.percentiles, this.props.initialPercentiles) ? (
      <>
        <EuiSpacer />
        <EuiTextAlign textAlign="right">
          <EuiButton
            fill
            isDisabled={this.state.percentiles.some(isInvalidPercentile)}
            onClick={this._onSubmit}
            size="s"
          >
            <FormattedMessage
              id="xpack.maps.styles.percentlesForm.submitBtnLabel"
              defaultMessage="Apply changes"
            />
          </EuiButton>
        </EuiTextAlign>
      </>
    ) : null;

    return (
      <div>
        {rows}
        {applyButton}
      </div>
    );
  }
}
