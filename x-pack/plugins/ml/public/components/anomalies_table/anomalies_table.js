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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInMemoryTable,
  EuiText,
} from '@elastic/eui';

import {
  formatHumanReadableDate,
  formatHumanReadableDateTime,
  formatHumanReadableDateTimeSeconds
} from '../../util/date_utils';

import { DescriptionCell } from './description_cell';
import { DetectorCell } from './detector_cell';
import { EntityCell } from './entity_cell';
import { InfluencersCell } from './influencers_cell';
import { AnomalyDetails } from './anomaly_details';
import { LinksMenu } from './links_menu';
import { checkPermission } from 'plugins/ml/privilege/check_privilege';

import { mlTableService } from '../../services/table_service';
import { mlFieldFormatService } from 'plugins/ml/services/field_format_service';
import { getSeverityColor, isRuleSupported } from 'plugins/ml/../common/util/anomaly_utils';
import { formatValue } from 'plugins/ml/formatters/format_value';
import { RuleEditorFlyout } from 'plugins/ml/components/rule_editor';


const INFLUENCERS_LIMIT = 5;    // Maximum number of influencers to display before a 'show more' link is added.


function renderTime(date, aggregationInterval) {
  if (aggregationInterval === 'hour') {
    return formatHumanReadableDateTime(date);
  } else if (aggregationInterval === 'second') {
    return formatHumanReadableDateTimeSeconds(date);
  } else {
    return formatHumanReadableDate(date);
  }
}

function showLinksMenuForItem(item) {
  const canConfigureRules = (isRuleSupported(item) && checkPermission('canUpdateJob'));
  return (canConfigureRules ||
    item.isTimeSeriesViewDetector ||
    item.entityName === 'mlcategory' ||
    item.customUrls !== undefined);
}

function getColumns(
  items,
  examplesByJobId,
  isAggregatedData,
  interval,
  timefilter,
  showViewSeriesLink,
  showRuleEditorFlyout,
  itemIdToExpandedRowMap,
  toggleRow,
  filter) {

  const columns = [
    {
      name: '',
      render: (item) => (
        <EuiButtonIcon
          onClick={() => toggleRow(item)}
          iconType={itemIdToExpandedRowMap[item.rowId] ? 'arrowDown' : 'arrowRight'}
          aria-label={itemIdToExpandedRowMap[item.rowId] ? 'Hide details' : 'Show details'}
          data-row-id={item.rowId}
        />
      )
    },
    {
      field: 'time',
      name: 'time',
      dataType: 'date',
      render: (date) => renderTime(date, interval),
      textOnly: true,
      sortable: true
    },
    {
      field: 'severity',
      name: `${(isAggregatedData === true) ? 'max ' : ''}severity`,
      render: (score) => (
        <EuiHealth color={getSeverityColor(score)} compressed="true">
          {score >= 1 ? Math.floor(score) : '< 1'}
        </EuiHealth>
      ),
      sortable: true
    },
    {
      field: 'detector',
      name: 'detector',
      render: (detectorDescription, item) => (
        <DetectorCell
          detectorDescription={detectorDescription}
          numberOfRules={item.rulesLength}
        />
      ),
      textOnly: true,
      sortable: true
    }
  ];

  if (items.some(item => item.entityValue !== undefined)) {
    columns.push({
      field: 'entityValue',
      name: 'found for',
      render: (entityValue, item) => (
        <EntityCell
          entityName={item.entityName}
          entityValue={entityValue}
          filter={filter}
        />
      ),
      textOnly: true,
      sortable: true
    });
  }

  if (items.some(item => item.influencers !== undefined)) {
    columns.push({
      field: 'influencers',
      name: 'influenced by',
      render: (influencers) => (
        <InfluencersCell
          limit={INFLUENCERS_LIMIT}
          influencers={influencers}
        />
      ),
      textOnly: true,
      sortable: true
    });
  }

  // Map the additional 'sort' fields to the actual, typical and description
  // fields to ensure sorting is done correctly on the underlying metric value
  // and not on e.g. the actual values array as a String.
  if (items.some(item => item.actual !== undefined)) {
    columns.push({
      field: 'actualSort',
      name: 'actual',
      render: (actual, item) => {
        const fieldFormat = mlFieldFormatService.getFieldFormat(item.jobId, item.source.detector_index);
        return formatValue(item.actual, item.source.function, fieldFormat);
      },
      sortable: true
    });
  }

  if (items.some(item => item.typical !== undefined)) {
    columns.push({
      field: 'typicalSort',
      name: 'typical',
      render: (typical, item) => {
        const fieldFormat = mlFieldFormatService.getFieldFormat(item.jobId, item.source.detector_index);
        return formatValue(item.typical, item.source.function, fieldFormat);
      },
      sortable: true
    });

    // Assume that if we are showing typical, there will be an actual too,
    // so we can add a column to describe how actual compares to typical.
    const nonTimeOfDayOrWeek = items.some((item) => {
      const summaryRecFunc = item.source.function;
      return summaryRecFunc !== 'time_of_day' && summaryRecFunc !== 'time_of_week';
    });
    if (nonTimeOfDayOrWeek === true) {
      columns.push({
        field: 'metricDescriptionSort',
        name: 'description',
        render: (metricDescriptionSort, item) => (
          <DescriptionCell
            actual={item.actual}
            typical={item.typical}
          />
        ),
        textOnly: true,
        sortable: true
      });
    }
  }

  columns.push({
    field: 'jobId',
    name: 'job ID',
    sortable: true
  });

  const showLinks = (showViewSeriesLink === true) || items.some(item => showLinksMenuForItem(item));

  if (showLinks === true) {
    columns.push({
      name: 'actions',
      render: (item) => {
        if (showLinksMenuForItem(item) === true) {
          return (
            <LinksMenu
              anomaly={item}
              showViewSeriesLink={showViewSeriesLink}
              isAggregatedData={isAggregatedData}
              interval={interval}
              timefilter={timefilter}
              showRuleEditorFlyout={showRuleEditorFlyout}
            />
          );
        } else {
          return null;
        }
      },
      sortable: false
    });
  }

  const showExamples = items.some(item => item.entityName === 'mlcategory');
  if (showExamples === true) {
    columns.push({
      name: 'category examples',
      sortable: false,
      truncateText: true,
      render: (item) => {
        const examples = _.get(examplesByJobId, [item.jobId, item.entityValue], []);
        return (
          <EuiText size="xs">
            {examples.map((example, i) => {
              return <span key={`example${i}`} className="category-example">{example}</span>;
            }
            )}
          </EuiText>
        );
      },
      textOnly: true,
    });
  }

  return columns;
}

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

  toggleRow = (item) => {
    const itemIdToExpandedRowMap = { ...this.state.itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMap[item.rowId]) {
      delete itemIdToExpandedRowMap[item.rowId];
    } else {
      const examples = (item.entityName === 'mlcategory') ?
        _.get(this.props.tableData, ['examplesByJobId', item.jobId, item.entityValue]) : undefined;
      itemIdToExpandedRowMap[item.rowId] = (
        <AnomalyDetails
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
