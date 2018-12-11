/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
} from '@elastic/eui';

import { FromExpression } from './from_expression';
import { GroupByExpression } from './group_by_expression';
import { JoinExpression } from './join_expression';
import { OnExpression } from './on_expression';
import { SelectExpression } from './select_expression';

import {
  indexPatternService,
} from '../../../../kibana_services';

const getIndexPatternId = (props) => {
  return _.get(props, 'join.right.indexPatternId');
};

/*
 * SELECT <metric_agg>
 * FROM <left_source (can not be changed)>
 * LEFT JOIN <right_source (index-pattern)>
 * ON <left_field>
 * GROUP BY <right_field>
 */
export class Join extends Component {

  state = {
    leftFields: null,
    leftSourceName: '',
    rightFields: undefined,
    loadError: undefined,
    prevIndexPatternId: getIndexPatternId(this.props),
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadLeftFields();
    this._loadLeftSourceName();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (!this.state.rigthFields && getIndexPatternId(this.props)) {
      this._loadRightFields(getIndexPatternId(this.props));
    }
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextIndexPatternId = getIndexPatternId(nextProps);
    if (nextIndexPatternId !== prevState.prevIndexPatternId) {
      return {
        rightFields: undefined,
        loadError: undefined,
        prevIndexPatternId: nextIndexPatternId,
      };
    }

    return null;
  }

  async _loadRightFields(indexPatternId) {
    if (!indexPatternId) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: `Unable to find Index pattern ${indexPatternId}`
        });
      }
      return;
    }

    if (indexPatternId !== this.state.prevIndexPatternId) {
      // ignore out of order responses
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ rightFields: indexPattern.fields });
  }

  async _loadLeftSourceName() {
    const leftSourceName = await this.props.layer.getSourceName();
    if (!this._isMounted) {
      return;
    }
    this.setState({ leftSourceName });
  }

  async _loadLeftFields() {
    const stringFields = await this.props.layer.getStringFields();
    if (!this._isMounted) {
      return;
    }
    this.setState({ leftFields: stringFields });
  }

  _onLeftFieldChange = (leftField) => {
    this.props.onChange({
      leftField: leftField,
      right: this.props.join.right,
    });
  };

  _onRightSourceChange = ({ indexPatternId, indexPatternTitle }) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        id: this.props.join.right.id,
        indexPatternId,
        indexPatternTitle,
      },
    });
  }

  _onRightFieldChange = (term) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        term
      },
    });
  }

  _onMetricsChange = (metrics) => {
    this.props.onChange({
      leftField: this.props.join.leftField,
      right: {
        ...this.props.join.right,
        metrics,
      },
    });
  }

  render() {
    const {
      join,
      onRemove,
    } = this.props;
    const {
      leftSourceName,
      leftFields,
      rightFields,
    } = this.state;
    const right = _.get(join, 'right', {});
    const rightSourceName = right.indexPatternTitle ? right.indexPatternTitle : right.indexPatternId;

    let onExpression;
    if (leftFields && rightFields) {
      onExpression = (
        <EuiFlexItem grow={false}>
          <OnExpression
            leftValue={join.leftField}
            leftFields={leftFields}
            onLeftChange={this._onLeftFieldChange}

            rightValue={right.term}
            rightFields={rightFields}
            onRightChange={this._onRightFieldChange}
          />
        </EuiFlexItem>
      );
    }

    let groupByExpression;
    if (right.indexPatternId && right.term) {
      groupByExpression = (
        <EuiFlexItem grow={false}>
          <GroupByExpression
            rightSourceName={rightSourceName}
            term={right.term}
          />
        </EuiFlexItem>
      );
    }
    return (
      <EuiFlexGroup className="gisJoinItem" responsive={false} wrap={true} gutterSize="s">

        <EuiFlexItem grow={false}>
          <SelectExpression
            metrics={right.metrics}
            rightFields={rightFields}
            onChange={this._onMetricsChange}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <FromExpression
            leftSourceName={leftSourceName}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <JoinExpression
            indexPatternId={right.indexPatternId}
            rightSourceName={rightSourceName}
            onChange={this._onRightSourceChange}
          />
        </EuiFlexItem>

        {onExpression}

        {groupByExpression}

        <EuiButtonIcon
          className="gisJoinItem__delete"
          iconType="trash"
          color="danger"
          aria-label="Delete join"
          title="Delete join"
          onClick={onRemove}
        />
      </EuiFlexGroup>
    );
  }
}
