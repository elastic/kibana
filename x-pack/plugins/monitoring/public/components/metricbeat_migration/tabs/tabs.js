/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import {
  EuiTabbedContent,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiSteps,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';
import { getProductStatus } from './get_product_status';
import { getInstructionSteps } from '../instruction_steps';
import { getProductLabel } from './get_product_label';

function getProductMigrationLabel(product) {
  if (product.isFullyMigrated) {
    return null;
  }

  return (
    <Fragment>
      <p>To migrate, following the following instructions:</p>
      <EuiSpacer size="m"/>
    </Fragment>
  );
}

export class Tabs extends Component {
  state = {
    activeTabId: null,
    hasCheckedMigrationStatus: false,
    checkingMigrationStatus: false,
  }

  buildTabs() {
    const { products, esMonitoringUrl, updateCapabilities } = this.props;
    const { checkingMigrationStatus, hasCheckedMigrationStatus } = this.state;

    const tabs = products.map(product => {
      const status = getProductStatus(product);

      let instructions = null;
      if (status.showInstructions) {
        const instructionSteps = getInstructionSteps(product, {
          doneWithMigration: async () => {
            await updateCapabilities();
            this.setState({ activeTabId: 'overview' });
          },
          kibanaUrl: '',
          esMonitoringUrl,
          checkForMigrationStatus: async () => {
            this.setState({ checkingMigrationStatus: true });
            await updateCapabilities();
            this.setState({ checkingMigrationStatus: false, hasCheckedMigrationStatus: true });
          },
          checkingMigrationStatus,
          hasCheckedMigrationStatus,
        });

        instructions = (
          <Fragment>
            <EuiSpacer size="m"/>
            {getProductMigrationLabel(product)}
            <EuiPanel>
              <EuiSteps steps={instructionSteps}/>
            </EuiPanel>
          </Fragment>
        );
      }

      return {
        id: product.name,
        name: getProductLabel(product.name),
        content: (
          <Fragment>
            <EuiSpacer size="m"/>
            <EuiCallOut
              title={status.label}
              color={status.color}
              iconType={status.icon}
            />
            {instructions}
          </Fragment>
        )
      };
    });

    const overviewSteps = products.reduce((steps, product) => {
      if (product.totalUniqueInstanceCount > 0) {
        const status = getProductStatus(product);

        let action;
        if (status.showInstructions) {
          action = (
            <EuiButton onClick={() => this.setState({ activeTabId: product.name })}>
              Fix
            </EuiButton>
          );
        }

        steps.push({
          title: getProductLabel(product.name),
          status: status.stepStatus,
          children: (
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={4}>
                <EuiCallOut
                  title={status.label}
                  color={status.color}
                  iconType={status.icon}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {action}
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        });
      }
      return steps;
    }, []);

    tabs.unshift({
      id: 'overview',
      name: 'Overview',
      content: (
        <EuiPanel>
          <EuiSteps steps={overviewSteps}/>
        </EuiPanel>
      )
    });

    return tabs;
  }

  changeTab = tabId => this.setState({ activeTabId: tabId })

  render() {
    const { activeTabId } = this.state;

    const tabs = this.buildTabs();
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
