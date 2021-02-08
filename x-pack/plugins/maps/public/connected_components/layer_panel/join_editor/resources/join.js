/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JoinExpression } from './join_expression';
import { MetricsExpression } from './metrics_expression';
import { WhereExpression } from './where_expression';
import { GlobalFilterCheckbox } from '../../../../components/global_filter_checkbox';
import { GlobalTimeCheckbox } from '../../../../components/global_time_checkbox';

import { indexPatterns } from '../../../../../../../../src/plugins/data/public';

import { getIndexPatternService } from '../../../../kibana_services';
import { SOURCE_TYPES } from '../../../../../common/constants';

export class Join extends Component {
  state = {
    rightFields: undefined,
    indexPattern: undefined,
    loadError: undefined,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadRightFields(_.get(this.props.join, 'right.indexPatternId'));
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadRightFields(indexPatternId) {
    if (!indexPatternId) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: i18n.translate('xpack.maps.layerPanel.join.noIndexPatternErrorMessage', {
            defaultMessage: `Unable to find Index pattern {indexPatternId}`,
            values: { indexPatternId },
          }),
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      rightFields: indexPattern.fields.filter((field) => !indexPatterns.isNestedField(field)),
      indexPattern,
    });
  }

  _onLeftFieldChange = (leftField) => {
    this.props.onChange({
      leftField: leftField,
      right: this.props.join.right,
    });
  };

  _onRightSourceChange = ({ indexPatternId, indexPatternTitle }) => {
    this.setState({
      rightFields: undefined,
      loadError: undefined,
    });
    this._loadRightFields(indexPatternId);
    // eslint-disable-next-line no-unused-vars
    const { term, ...restOfRight } = this.props.join.right;
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...restOfRight,
        indexPatternId,
        indexPatternTitle,
        type: SOURCE_TYPES.ES_TERM_SOURCE,
      },
    });
  };

  _onRightFieldChange = (term) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        term,
      },
    });
  };

  _onRightSizeChange = (size) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        size,
      },
    });
  };

  _onMetricsChange = (metrics) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        metrics,
      },
    });
  };

  _onWhereQueryChange = (whereQuery) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        whereQuery,
      },
    });
  };

  _onApplyGlobalQueryChange = (applyGlobalQuery) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        applyGlobalQuery,
      },
    });
  };

  _onApplyGlobalTimeChange = (applyGlobalTime) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        applyGlobalTime,
      },
    });
  };

  render() {
    const { join, onRemove, leftFields, leftSourceName } = this.props;
    const { rightFields, indexPattern } = this.state;
    const right = _.get(join, 'right', {});
    const rightSourceName = right.indexPatternTitle
      ? right.indexPatternTitle
      : right.indexPatternId;
    const isJoinConfigComplete = join.leftField && right.indexPatternId && right.term;

    let metricsExpression;
    let globalFilterCheckbox;
    let globalTimeCheckbox;
    if (isJoinConfigComplete) {
      metricsExpression = (
        <EuiFlexItem grow={false}>
          <MetricsExpression
            metrics={right.metrics}
            rightFields={rightFields}
            onChange={this._onMetricsChange}
          />
        </EuiFlexItem>
      );
      globalFilterCheckbox = (
        <GlobalFilterCheckbox
          applyGlobalQuery={right.applyGlobalQuery === 'undefined' ? true : right.applyGlobalQuery}
          setApplyGlobalQuery={this._onApplyGlobalQueryChange}
          label={i18n.translate('xpack.maps.layerPanel.join.applyGlobalQueryCheckboxLabel', {
            defaultMessage: `Apply global filter to join`,
          })}
        />
      );
      if (this.state.indexPattern && this.state.indexPattern.timeFieldName) {
        globalTimeCheckbox = (
          <GlobalTimeCheckbox
            applyGlobalTime={
              typeof right.applyGlobalTime === 'undefined' ? true : right.applyGlobalTime
            }
            setApplyGlobalTime={this._onApplyGlobalTimeChange}
            label={i18n.translate('xpack.maps.layerPanel.join.applyGlobalTimeCheckboxLabel', {
              defaultMessage: `Apply global time to join`,
            })}
          />
        );
      }
    }

    let whereExpression;
    if (indexPattern && isJoinConfigComplete) {
      whereExpression = (
        <EuiFlexItem grow={false}>
          <WhereExpression
            indexPattern={indexPattern}
            whereQuery={join.right.whereQuery}
            onChange={this._onWhereQueryChange}
          />
        </EuiFlexItem>
      );
    }

    return (
      <div className="mapJoinItem">
        <EuiFlexGroup className="mapJoinItem__inner" responsive={false} wrap={true} gutterSize="s">
          <EuiFlexItem grow={false}>
            <JoinExpression
              leftSourceName={leftSourceName}
              leftValue={join.leftField}
              leftFields={leftFields}
              onLeftFieldChange={this._onLeftFieldChange}
              rightSourceIndexPatternId={right.indexPatternId}
              rightSourceName={rightSourceName}
              onRightSourceChange={this._onRightSourceChange}
              rightValue={right.term}
              rightSize={right.size}
              rightFields={rightFields}
              onRightFieldChange={this._onRightFieldChange}
              onRightSizeChange={this._onRightSizeChange}
            />
          </EuiFlexItem>

          {metricsExpression}

          {whereExpression}
        </EuiFlexGroup>

        {globalFilterCheckbox}

        {globalTimeCheckbox}

        <EuiButtonIcon
          className="mapJoinItem__delete"
          iconType="trash"
          color="danger"
          aria-label={i18n.translate('xpack.maps.layerPanel.join.deleteJoinAriaLabel', {
            defaultMessage: 'Delete join',
          })}
          title={i18n.translate('xpack.maps.layerPanel.join.deleteJoinTitle', {
            defaultMessage: 'Delete join',
          })}
          onClick={onRemove}
        />
      </div>
    );
  }
}
