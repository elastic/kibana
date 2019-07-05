/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { Route } from 'react-router-dom';
import { ShowJson } from './show_json';
import { Summary } from './summary';
import { EditSettingsJson } from './edit_settings_json';
import { renderBadges } from '../../../../lib/render_badges';
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
import { IndexActionsContextMenu } from '../../components';
import { INDEX_OPEN } from '../../../../../common/constants';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const tabs = ['Summary', 'Settings', 'Mapping', 'Stats', 'Edit settings'];
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
          disabled={tab === 'Stats' && index.status !== INDEX_OPEN}
          key={i}
        >
          {capitalizeFirstLetter(tab)}
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
          <EuiTitle size="l" id="indexDetailsFlyoutTitle">
            <h2>{indexName}{renderBadges(index)}</h2>
          </EuiTitle>
          {index ? <EuiTabs>{this.renderTabs()}</EuiTabs> : null }
        </EuiFlyoutHeader>
        {content}
      </EuiFlyout>
    );
  }
}
