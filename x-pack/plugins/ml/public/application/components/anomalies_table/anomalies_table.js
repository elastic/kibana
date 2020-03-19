/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React table for displaying a list of anomalies.
 */

import PropTypes from 'prop-types';
import _ from 'lodash';

import React, { Component } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { getColumns } from './anomalies_table_columns';

import { AnomalyDetails } from './anomaly_details';

import { mlTableService } from '../../services/table_service';
import { RuleEditorFlyout } from '../rule_editor';
import { ml } from '../../services/ml_api_service';
import { INFLUENCERS_LIMIT, ANOMALIES_TABLE_TABS, MAX_CHARS } from './anomalies_table_constants';

class AnomaliesTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      itemIdToExpandedRowMap: {},
      showRuleEditorFlyout: () => {},
    };
  }

  isShowingAggregatedData = () => {
    return this.props.tableData.interval !== 'second';
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    // Update the itemIdToExpandedRowMap state if a change to the table data has resulted
    // in an anomaly that was previously expanded no longer being in the data.
    const itemIdToExpandedRowMap = prevState.itemIdToExpandedRowMap;
    const prevExpandedNotInData = Object.keys(itemIdToExpandedRowMap).find(rowId => {
      const matching = nextProps.tableData.anomalies.find(anomaly => {
        return anomaly.rowId === rowId;
      });

      return matching === undefined;
    });

    if (prevExpandedNotInData !== undefined) {
      // Anomaly data has changed and an anomaly that was previously expanded is no longer in the data.
      return {
        itemIdToExpandedRowMap: {},
      };
    }

    // Return null to indicate no change to state.
    return null;
  }

  toggleRow = async (item, tab = ANOMALIES_TABLE_TABS.DETAILS) => {
    const itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMap[item.rowId]) {
      delete itemIdToExpandedRowMap[item.rowId];
    } else {
      const examples =
        item.entityName === 'mlcategory'
          ? _.get(this.props.tableData, ['examplesByJobId', item.jobId, item.entityValue])
          : undefined;
      let definition = undefined;

      if (examples !== undefined) {
        try {
          definition = await ml.results.getCategoryDefinition(
            item.jobId,
            item.source.mlcategory[0]
          );

          if (definition.terms && definition.terms.length > MAX_CHARS) {
            definition.terms = `${definition.terms.substring(0, MAX_CHARS)}...`;
          }
          if (definition.regex && definition.regex.length > MAX_CHARS) {
            definition.terms = `${definition.regex.substring(0, MAX_CHARS)}...`;
          }
        } catch (error) {
          console.log('Error fetching category definition for row item.', error);
        }
      }

      itemIdToExpandedRowMap[item.rowId] = (
        <AnomalyDetails
          tabIndex={tab}
          anomaly={item}
          examples={examples}
          definition={definition}
          isAggregatedData={this.isShowingAggregatedData()}
          filter={this.props.filter}
          influencerFilter={this.props.influencerFilter}
          influencersLimit={INFLUENCERS_LIMIT}
        />
      );
    }
    this.setState({ itemIdToExpandedRowMap });
  };

  onMouseOverRow = record => {
    if (this.mouseOverRecord !== undefined) {
      if (this.mouseOverRecord.rowId !== record.rowId) {
        // Mouse is over a different row, fire mouseleave on the previous record.
        mlTableService.rowMouseleave$.next({ record: this.mouseOverRecord });

        // fire mouseenter on the new record.
        mlTableService.rowMouseenter$.next({ record });
      }
    } else {
      // Mouse is now over a row, fire mouseenter on the record.
      mlTableService.rowMouseenter$.next({ record });
    }

    this.mouseOverRecord = record;
  };

  onMouseLeaveRow = () => {
    if (this.mouseOverRecord !== undefined) {
      mlTableService.rowMouseleave$.next({ record: this.mouseOverRecord });
      this.mouseOverRecord = undefined;
    }
  };

  setShowRuleEditorFlyoutFunction = func => {
    this.setState({
      showRuleEditorFlyout: func,
    });
  };

  unsetShowRuleEditorFlyoutFunction = () => {
    const showRuleEditorFlyout = () => {};
    this.setState({
      showRuleEditorFlyout,
    });
  };

  render() {
    const { bounds, tableData, filter, influencerFilter } = this.props;

    if (
      tableData === undefined ||
      tableData.anomalies === undefined ||
      tableData.anomalies.length === 0
    ) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.ml.anomaliesTable.noMatchingAnomaliesFoundTitle"
                  defaultMessage="No matching anomalies found"
                />
              </h4>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const columns = getColumns(
      tableData.anomalies,
      tableData.jobIds,
      tableData.examplesByJobId,
      this.isShowingAggregatedData(),
      tableData.interval,
      bounds,
      tableData.showViewSeriesLink,
      this.state.showRuleEditorFlyout,
      this.state.itemIdToExpandedRowMap,
      this.toggleRow,
      filter,
      influencerFilter
    );

    const sorting = {
      sort: {
        field: 'severity',
        direction: 'desc',
      },
    };

    const getRowProps = item => {
      return {
        onMouseOver: () => this.onMouseOverRow(item),
        onMouseLeave: () => this.onMouseLeaveRow(),
        'data-test-subj': `mlAnomaliesListRow row-${item.rowId}`,
      };
    };

    return (
      <React.Fragment>
        <RuleEditorFlyout
          setShowFunction={this.setShowRuleEditorFlyoutFunction}
          unsetShowFunction={this.unsetShowRuleEditorFlyoutFunction}
        />
        <EuiInMemoryTable
          className="ml-anomalies-table eui-textOverflowWrap"
          items={tableData.anomalies}
          columns={columns}
          pagination={{
            pageSizeOptions: [10, 25, 100],
            initialPageSize: 25,
          }}
          sorting={sorting}
          itemId="rowId"
          itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
          compressed={true}
          rowProps={getRowProps}
          data-test-subj="mlAnomaliesTable"
        />
      </React.Fragment>
    );
  }
}
AnomaliesTable.propTypes = {
  bounds: PropTypes.object.isRequired,
  tableData: PropTypes.object,
  filter: PropTypes.func,
  influencerFilter: PropTypes.func,
};

export { AnomaliesTable };
