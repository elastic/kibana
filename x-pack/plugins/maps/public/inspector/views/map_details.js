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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const DETAILS_TAB_ID = 'details';
const STYLE_TAB_ID = 'mapStyle';

class MapDetails extends Component {
  tabs = [
    {
      id: DETAILS_TAB_ID,
      name: i18n.translate('xpack.maps.inspector.mapDetailsTitle', {
        defaultMessage: 'Map details',
      }),
      dataTestSubj: 'mapDetailsTab',
    },
    {
      id: STYLE_TAB_ID,
      name: i18n.translate('xpack.maps.inspector.mapboxStyleTitle', {
        defaultMessage: 'Mapbox style',
      }),
      dataTestSubj: 'mapboxStyleTab',
    },
  ];

  state = {
    selectedTabId: DETAILS_TAB_ID,
  };

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTab = () => {
    if (STYLE_TAB_ID === this.state.selectedTabId) {
      return (
        <div data-test-subj="mapboxStyleContainer">
          <EuiCodeBlock language="json" paddingSize="s">
            {JSON.stringify(this.props.mapStyle, null, 2)}
          </EuiCodeBlock>
        </div>
      );
    }

    return (
      <EuiTable style={{ tableLayout: 'auto' }}>
        <EuiTableBody>
          <EuiTableRow>
            <EuiTableRowCell>
              <FormattedMessage
                id="xpack.maps.inspector.centerLonLabel"
                defaultMessage="Center lon"
              />
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj="centerLon">{this.props.centerLon}</EuiTableRowCell>
          </EuiTableRow>

          <EuiTableRow>
            <EuiTableRowCell>
              <FormattedMessage
                id="xpack.maps.inspector.centerLatLabel"
                defaultMessage="Center lat"
              />
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj="centerLat">{this.props.centerLat}</EuiTableRowCell>
          </EuiTableRow>

          <EuiTableRow>
            <EuiTableRowCell>
              <FormattedMessage id="xpack.maps.inspector.zoomLabel" defaultMessage="Zoom" />
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj="zoom">{this.props.zoom}</EuiTableRowCell>
          </EuiTableRow>
        </EuiTableBody>
      </EuiTable>
    );
  };

  renderTabs() {
    return this.tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
        data-test-subj={tab.dataTestSubj}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  render() {
    return (
      <div>
        <EuiTabs size="s">{this.renderTabs()}</EuiTabs>

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
