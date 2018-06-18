/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Route } from "react-router-dom";
import { ShowJson } from './show_json';
import { Summary } from './summary';
import { EditSettingsJson } from './edit_settings_json';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTabs,
  EuiTab,
  EuiTitle
} from '@elastic/eui';
import { IndexActionsContextMenu } from "../../components";
import { INDEX_OPEN } from "../../../../../common/constants";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const tabs = ['Summary', 'Settings', 'Mapping', 'Stats', 'Edit settings'];
export class DetailPanel extends Component {
  renderTabs() {
    const { panelType, indexName, indexStatus, openDetailPanel } = this.props;

    return tabs.map((tab, index) => {
      const isSelected = tab === panelType;
      return (
        <EuiTab
          onClick={() => openDetailPanel({ panelType: tab, indexName })}
          isSelected={isSelected}
          data-test-subj={`detailPanelTab${isSelected ? "Selected" : ""}`}
          disabled={tab === 'stats' && indexStatus !== INDEX_OPEN}
          key={index}
        >
          {capitalizeFirstLetter(tab)}
        </EuiTab>
      );
    });
  }

  render() {
    const { panelType, indexName, closeDetailPanel } = this.props;
    if (!panelType) {
      return null;
    }
    let component = null;
    switch (panelType) {
      case 'Edit settings':
        component = <EditSettingsJson />;
        break;
      case 'Mapping':
      case 'Settings':
      case 'Stats':
        component = <ShowJson />;
        break;
      default:
        component = <Summary />;
    }
    return (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="indexDetailsFlyoutTitle"
      >
        <EuiFlyoutHeader>
          <EuiTitle size="l" id="indexDetailsFlyoutTitle">
            <h2>{indexName}</h2>
          </EuiTitle>
          <EuiTabs>{this.renderTabs()}</EuiTabs>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>{component}</EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeDetailPanel}>
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <Route
                key="menu"
                render={() => (
                  <IndexActionsContextMenu
                    iconSide="left"
                    indexNames={[indexName]}
                    anchorPosition="upRight"
                    detailPanel={true}
                    iconType="arrowUp"
                    label="Manage"
                  />
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
