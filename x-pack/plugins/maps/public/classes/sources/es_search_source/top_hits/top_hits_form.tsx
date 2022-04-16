/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component, Fragment } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IndexPatternField } from '@kbn/data-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import { SingleFieldSelect } from '../../../../components/single_field_select';
import { getIndexPatternService } from '../../../../kibana_services';
// @ts-expect-error
import { ValidatedRange } from '../../../../components/validated_range';
import { DEFAULT_MAX_INNER_RESULT_WINDOW } from '../../../../../common/constants';
import { loadIndexSettings } from '../util/load_index_settings';
import { OnSourceChangeArgs } from '../../source';

interface Props {
  indexPatternId: string;
  isColumnCompressed?: boolean;
  onChange: (args: OnSourceChangeArgs) => void;
  sortField: string;
  sortFields: IndexPatternField[];
  sortOrder: SortDirection;
  termFields: IndexPatternField[];
  topHitsSplitField: string | null;
  topHitsSize: number;
}

interface State {
  maxInnerResultWindow: number;
}

export class TopHitsForm extends Component<Props, State> {
  state = {
    maxInnerResultWindow: DEFAULT_MAX_INNER_RESULT_WINDOW,
  };
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
    this.loadIndexSettings();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onTopHitsSplitFieldChange = (topHitsSplitField?: string) => {
    if (!topHitsSplitField) {
      return;
    }
    this.props.onChange({ propName: 'topHitsSplitField', value: topHitsSplitField });
  };

  _onTopHitsSizeChange = (size: number) => {
    this.props.onChange({ propName: 'topHitsSize', value: size });
  };

  _onSortFieldChange = (sortField?: string) => {
    this.props.onChange({ propName: 'sortField', value: sortField });
  };

  _onSortOrderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    this.props.onChange({ propName: 'sortOrder', value: event.target.value });
  };

  async loadIndexSettings() {
    try {
      const indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
      const { maxInnerResultWindow } = await loadIndexSettings(indexPattern!.title);
      if (this._isMounted) {
        this.setState({ maxInnerResultWindow });
      }
    } catch (err) {
      return;
    }
  }

  render() {
    let sizeSlider;
    let sortField;
    let sortOrder;
    if (this.props.topHitsSplitField) {
      sizeSlider = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSizeLabel', {
            defaultMessage: 'Documents per entity',
          })}
          display={this.props.isColumnCompressed ? 'columnCompressed' : 'row'}
        >
          <ValidatedRange
            min={1}
            max={this.state.maxInnerResultWindow}
            step={1}
            value={this.props.topHitsSize}
            onChange={this._onTopHitsSizeChange}
            showLabels
            showInput
            showRange
            data-test-subj="layerPanelTopHitsSize"
            compressed
          />
        </EuiFormRow>
      );

      sortField = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esTopHitsSearch.sortFieldLabel', {
            defaultMessage: 'Sort field',
          })}
          display={this.props.isColumnCompressed ? 'columnCompressed' : 'row'}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esSearch.sortFieldSelectPlaceholder', {
              defaultMessage: 'Select sort field',
            })}
            value={this.props.sortField}
            onChange={this._onSortFieldChange}
            fields={this.props.sortFields}
            compressed
          />
        </EuiFormRow>
      );

      sortOrder = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esTopHitsSearch.sortOrderLabel', {
            defaultMessage: 'Sort order',
          })}
          display={this.props.isColumnCompressed ? 'columnCompressed' : 'row'}
        >
          <EuiSelect
            disabled={!this.props.sortField}
            options={[
              {
                text: i18n.translate('xpack.maps.source.esSearch.ascendingLabel', {
                  defaultMessage: 'ascending',
                }),
                value: SortDirection.asc,
              },
              {
                text: i18n.translate('xpack.maps.source.esSearch.descendingLabel', {
                  defaultMessage: 'descending',
                }),
                value: SortDirection.desc,
              },
            ]}
            value={this.props.sortOrder}
            onChange={this._onSortOrderChange}
            compressed
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSplitFieldLabel', {
            defaultMessage: 'Entity',
          })}
          display={this.props.isColumnCompressed ? 'columnCompressed' : 'row'}
        >
          <SingleFieldSelect
            placeholder={i18n.translate(
              'xpack.maps.source.esSearch.topHitsSplitFieldSelectPlaceholder',
              {
                defaultMessage: 'Select entity field',
              }
            )}
            value={this.props.topHitsSplitField}
            onChange={this._onTopHitsSplitFieldChange}
            fields={this.props.termFields}
            isClearable={false}
            compressed
          />
        </EuiFormRow>

        {sizeSlider}

        {sortField}

        {sortOrder}
      </Fragment>
    );
  }
}
