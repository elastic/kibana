import { EuiColorPicker, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import React, { ChangeEvent, Component } from 'react';
import { i18n } from '@kbn/i18n';
import { COLOR_FILTER_OPERATIONS } from '../../../../common/constants';
import { ColorFilter } from '../../../../common/descriptor_types';

interface Props {
  color?: string;
  operation?: string;
  percentage?: number;
  onColorFilterChange: (colorFilter: ColorFilter) => void;
}

interface State {
  color: string;
  operation: string;
  percentage: number;
}

const DEFAULT_OPERATION = 'screen';
const DEFAULT_MIX_PERCENTAGE = 0.5;

export class ColorFilterSelect extends Component<Props, State> {
  state: State = {
    color: this.props.color || '',
    operation: this.props.operation || DEFAULT_OPERATION,
    percentage: this.props.percentage || DEFAULT_MIX_PERCENTAGE,
  };

  _onColorChange = (color: string) => {
    this.setState({ color });
    const { operation, percentage } = this.props;
    this.props.onColorFilterChange({ color, operation, percentage });
  };

  _onOperationChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const operation = e.target.value;
    this.setState({ operation });
    const { color, percentage } = this.props;
    this.props.onColorFilterChange({ color, operation, percentage });
  };

  _onPercentageChange = (percentage: number) => {
    this.setState({ percentage });
    const { color, operation } = this.props;
    this.props.onColorFilterChange({ color, operation, percentage });
  };

  _renderColorPicker = () => {
    return (
      <EuiFormRow
        display="rowCompressed"
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.colorFilterPicker', {
          defaultMessage: 'Apply color filter',
        })}
      >
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem>
            <EuiColorPicker
              compressed
              prepend="Color"
              aria-label="Color"
              color={this.state.color}
              onChange={this._onColorChange}
              secondaryInputDisplay="top"
              isClearable
              format="hex"
              placeholder="No filter"
              aria-placeholder="No filter"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              options={COLOR_FILTER_OPERATIONS.map((o) => {
                return { text: o, value: o };
              })}
              prepend="Operation"
              value={this.props.operation}
              aria-label="Operation"
              onChange={this._onOperationChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  };

  render() {
    return this._renderColorPicker();
  }
}
