/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiTab,
  EuiTabs,
  EuiCodeBlock,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

const DETAILS_TAB_ID = 'details';
const STYLE_TAB_ID = 'mapStyle';

class MapDetails extends Component {

  tabs = [{
    id: DETAILS_TAB_ID,
    name: 'Map details',
  }, {
    id: STYLE_TAB_ID,
    name: 'Mapbox style',
  }];

  state = {
    selectedTabId: DETAILS_TAB_ID,
  };

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  }

  renderTab = () => {
    if (STYLE_TAB_ID === this.state.selectedTabId) {
      return (
        <EuiCodeBlock
          language="json"
          paddingSize="s"
          data-test-subj="inspectorRequestBody"
        >
          { JSON.stringify(this.props.mapStyle, null, 2) }
        </EuiCodeBlock>
      );
    }

    return (
      <EuiTable style={{ tableLayout: 'auto' }}>
        <EuiTableBody>
          <EuiTableRow>
            <EuiTableRowCell>
              Center lon
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj="centerLon">{this.props.centerLon}</EuiTableRowCell>
          </EuiTableRow>

          <EuiTableRow>
            <EuiTableRowCell>
              Center lat
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj="centerLat">{this.props.centerLat}</EuiTableRowCell>
          </EuiTableRow>

          <EuiTableRow>
            <EuiTableRowCell>
              Zoom
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj="zoom">{this.props.zoom}</EuiTableRowCell>
          </EuiTableRow>
        </EuiTableBody>
      </EuiTable>
    );
  }

  renderTabs() {
    return this.tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  render() {
    return (
      <div>
        <EuiTabs size="s">
          {this.renderTabs()}
        </EuiTabs>

        {this.renderTab()}

      </div>
    );
  }
}

MapDetails.propTypes = {
  centerLon: PropTypes.number.isRequired,
  centerLat: PropTypes.number.isRequired,
  zoom: PropTypes.number.isRequired,
  mapStyle: PropTypes.object.isRequired,
};

export { MapDetails };
