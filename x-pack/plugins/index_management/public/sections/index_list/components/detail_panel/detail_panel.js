/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { Route } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiTitle,
} from '@elastic/eui';
import { renderBadges } from '../../../../lib/render_badges';
import { INDEX_OPEN } from '../../../../../common/constants';
import {
  TAB_SUMMARY,
  TAB_SETTINGS,
  TAB_MAPPING,
  TAB_STATS,
  TAB_EDIT_SETTINGS,
} from '../../../../constants';
import { IndexActionsContextMenu } from '../../components';
import { ShowJson } from './show_json';
import { Summary } from './summary';
import { EditSettingsJson } from './edit_settings_json';

const tabToHumanizedMap = {
  [TAB_SUMMARY]: (
    <FormattedMessage
      id="xpack.idxMgmt.detailPanel.tabSummaryLabel"
      defaultMessage="Summary"
    />
  ),
  [TAB_SETTINGS]: (
    <FormattedMessage
      id="xpack.idxMgmt.detailPanel.tabSettingsLabel"
      defaultMessage="Settings"
    />
  ),
  [TAB_MAPPING]: (
    <FormattedMessage
      id="xpack.idxMgmt.detailPanel.tabMappingLabel"
      defaultMessage="Mapping"
    />
  ),
  [TAB_STATS]: (
    <FormattedMessage
      id="xpack.idxMgmt.detailPanel.tabStatsLabel"
      defaultMessage="Stats"
    />
  ),
  [TAB_EDIT_SETTINGS]: (
    <FormattedMessage
      id="xpack.idxMgmt.detailPanel.tabEditSettingsLabel"
      defaultMessage="Edit settings"
    />
  ),
};

const tabs = [
  TAB_SUMMARY,
  TAB_SETTINGS,
  TAB_MAPPING,
  TAB_STATS,
  TAB_EDIT_SETTINGS,
];

export class DetailPanel extends Component {
  renderTabs() {
    const { panelType, indexName, index, openDetailPanel } = this.props;
    return tabs.map((tab, i) => {
      const isSelected = tab === panelType;
      return (
        <EuiTab
          onClick={() => openDetailPanel({ panelType: tab, indexName })}
          isSelected={isSelected}
          data-test-subj={`detailPanelTab${isSelected ? 'Selected' : ''}`}
          disabled={tab === TAB_STATS && index.status !== INDEX_OPEN}
          key={i}
        >
          {tabToHumanizedMap[tab]}
        </EuiTab>
      );
    });
  }
  render() {
    const { panelType, indexName, index, closeDetailPanel } = this.props;
    if (!panelType) {
      return null;
    }
    let component = null;
    switch (panelType) {
      case TAB_EDIT_SETTINGS:
        component = <EditSettingsJson />;
        break;
      case TAB_MAPPING:
      case TAB_SETTINGS:
      case TAB_STATS:
        component = <ShowJson />;
        break;
      default:
        component = <Summary />;
    }
    const content = index ? (
      <Fragment>
        <EuiFlyoutBody>{component}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
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
                    label={
                      <FormattedMessage
                        id="xpack.idxMgmt.detailPanel.manageContextMenuLabel"
                        defaultMessage="Manage"
                      />
                    }
                  />
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    ) : (
      <EuiFlyoutBody>
        <EuiSpacer size="l" />
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.idxMgmt.detailPanel.missingIndexTitle"
              defaultMessage="Missing index"
            />
          }
          color="danger"
          iconType="cross"
        >
          <FormattedMessage
            id="xpack.idxMgmt.detailPanel.missingIndexMessage"
            defaultMessage="This index does not exist.
              It might have been deleted by a running job or another system."
          />
        </EuiCallOut>
      </EuiFlyoutBody>
    );
    return (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="indexDetailsFlyoutTitle"
      >
        <EuiFlyoutHeader>
          <EuiTitle id="indexDetailsFlyoutTitle">
            <h2>{indexName}{renderBadges(index)}</h2>
          </EuiTitle>
          {index ? <EuiTabs>{this.renderTabs()}</EuiTabs> : null }
        </EuiFlyoutHeader>
        {content}
      </EuiFlyout>
    );
  }
}
