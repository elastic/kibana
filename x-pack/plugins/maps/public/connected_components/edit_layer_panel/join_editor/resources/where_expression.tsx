/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiPopover, EuiExpression, EuiFormHelpText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView, Query } from 'src/plugins/data/common';
import { APP_ID } from '../../../../../common/constants';
import { getData } from '../../../../kibana_services';

interface Props {
  indexPattern: DataView;
  onChange: (whereQuery?: Query) => void;
  whereQuery?: Query;
}

interface State {
  isPopoverOpen: boolean;
}

export class WhereExpression extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onQueryChange = ({ query }: { query?: Query }) => {
    this.props.onChange(query);
    this._closePopover();
  };

  render() {
    const { SearchBar } = getData().ui;
    const { whereQuery, indexPattern } = this.props;
    const expressionValue =
      whereQuery && whereQuery.query
        ? whereQuery.query
        : i18n.translate('xpack.maps.layerPanel.whereExpression.expressionValuePlaceholder', {
            defaultMessage: '-- add filter --',
          });

    return (
      <EuiPopover
        id="whereClausePopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        anchorPosition="leftCenter"
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description={i18n.translate(
              'xpack.maps.layerPanel.whereExpression.expressionDescription',
              {
                defaultMessage: 'where',
              }
            )}
            uppercase={false}
            value={expressionValue}
            data-test-subj="mapJoinWhereExpressionButton"
          />
        }
      >
        <div className="mapFilterEditor" data-test-subj="mapJoinWhereFilterEditor">
          <EuiFormHelpText className="mapJoinExpressionHelpText">
            <FormattedMessage
              id="xpack.maps.layerPanel.whereExpression.helpText"
              defaultMessage="Use a query to narrow right source."
            />
          </EuiFormHelpText>
          <SearchBar
            appName={APP_ID}
            showFilterBar={false}
            showDatePicker={false}
            showQueryInput={true}
            query={whereQuery ? whereQuery : getData().query.queryString.getDefaultQuery()}
            onQuerySubmit={this._onQueryChange}
            indexPatterns={[indexPattern]}
            customSubmitButton={
              <EuiButton fill data-test-subj="mapWhereFilterEditorSubmitButton">
                <FormattedMessage
                  id="xpack.maps.layerPanel.whereExpression.queryBarSubmitButtonLabel"
                  defaultMessage="Set filter"
                />
              </EuiButton>
            }
          />
        </div>
      </EuiPopover>
    );
  }
}
