/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiTabbedContent
} from '@elastic/eui';
import { buildTabs } from './build_tabs';

export class Tabs extends Component {
  state = {
    activeTabId: null,
  }

  render() {
    const { products, instructionOpts } = this.props;
    const { activeTabId } = this.state;

    const tabs = buildTabs(products, instructionOpts);
    const activeTab = tabs.find(tab => tab.id === activeTabId);

    return (
      <EuiTabbedContent
        tabs={tabs}
        selectedTab={activeTab}
        onTabClick={tab => this.setState({ activeTabId: tab.id })}
      />
    );
  }
}
