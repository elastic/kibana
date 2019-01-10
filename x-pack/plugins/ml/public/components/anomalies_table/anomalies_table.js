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

import React, {
  Component
} from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiText,
} from '@elastic/eui';

import { getColumns } from './anomalies_table_columns';

import { AnomalyDetails } from './anomaly_details';

import { mlTableService } from '../../services/table_service';
import { RuleEditorFlyout } from '../../components/rule_editor';
import {
  INFLUENCERS_LIMIT,
  ANOMALIES_TABLE_TABS
} from './anomalies_table_constants';

class AnomaliesTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      itemIdToExpandedRowMap: {},
      showRuleEditorFlyout: () => {}
    };
  }

  isShowingAggregatedData = () => {
    return (this.props.tableData.interval !== 'second');
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    // Update the itemIdToExpandedRowMap state if a change to the table data has resulted
    // in an anomaly that was previously expanded no longer being in the data.
    const itemIdToExpandedRowMap = prevState.itemIdToExpandedRowMap;
    const prevExpandedNotInData = Object.keys(itemIdToExpandedRowMap).find((rowId) => {
      const matching = nextProps.tableData.anomalies.find((anomaly) => {
        return anomaly.rowId === rowId;
      });

      return (matching === undefined);
    });

    if (prevExpandedNotInData !== undefined) {
      // Anomaly data has changed and an anomaly that was previously expanded is no longer in the data.
      return {
        itemIdToExpandedRowMap: {}
      };
    }

    // Return null to indicate no change to state.
    return null;
  }

  toggleRow = (item, tab = ANOMALIES_TABLE_TABS.DETAILS) => {
    const itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMap[item.rowId]) {
      delete itemIdToExpandedRowMap[item.rowId];
    } else {
      const examples = (item.entityName === 'mlcategory') ?
        _.get(this.props.tableData, ['examplesByJobId', item.jobId, item.entityValue]) : undefined;
      itemIdToExpandedRowMap[item.rowId] = (
        <AnomalyDetails
          tabIndex={tab}
          anomaly={item}
          examples={examples}
          isAggregatedData={this.isShowingAggregatedData()}
          filter={this.props.filter}
          influencersLimit={INFLUENCERS_LIMIT}
        />
      );
    }
    this.setState({ itemIdToExpandedRowMap });
  };

  onMouseOverRow = (record) => {
    if (this.mouseOverRecord !== undefined) {
      if (this.mouseOverRecord.rowId !== record.rowId) {
        // Mouse is over a different row, fire mouseleave on the previous record.
        mlTableService.rowMouseleave.changed(this.mouseOverRecord);

        // fire mouseenter on the new record.
        mlTableService.rowMouseenter.changed(record);
      }
    } else {
      // Mouse is now over a row, fire mouseenter on the record.
      mlTableService.rowMouseenter.changed(record);
    }

    this.mouseOverRecord = record;
  }

  onMouseLeaveRow = () => {
    if (this.mouseOverRecord !== undefined) {
      mlTableService.rowMouseleave.changed(this.mouseOverRecord);
      this.mouseOverRecord = undefined;
    }
  };

  setShowRuleEditorFlyoutFunction = (func) => {
    this.setState({
      showRuleEditorFlyout: func
    });
  }

  unsetShowRuleEditorFlyoutFunction = () => {
    const showRuleEditorFlyout = () => {};
    this.setState({
      showRuleEditorFlyout
    });
  }

  render() {
    const { timefilter, tableData, filter } = this.props;

    if (tableData === undefined ||
      tableData.anomalies === undefined || tableData.anomalies.length === 0) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h4>No matching anomalies found</h4>
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
      timefilter,
      tableData.showViewSeriesLink,
      this.state.showRuleEditorFlyout,
      this.state.itemIdToExpandedRowMap,
      this.toggleRow,
      filter);

    const sorting = {
      sort: {
        field: 'severity',
        direction: 'desc',
      }
    };

    const getRowProps = (item) => {
      return {
        onMouseOver: () => this.onMouseOverRow(item),
        onMouseLeave: () => this.onMouseLeaveRow()
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
            initialPageSize: 25
          }}
          sorting={sorting}
          itemId="rowId"
          itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
          compressed={true}
          rowProps={getRowProps}
        />
      </React.Fragment>
    );
  }
}
AnomaliesTable.propTypes = {
  timefilter: PropTypes.object.isRequired,
  tableData: PropTypes.object,
  filter: PropTypes.func
};

export { AnomaliesTable };
