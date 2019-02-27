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
    tabs: [],
    updatedProducts: [],
    checkingMigrationStatus: false,
  }

  componentWillMount() {
    this.buildTabs();
  }

  findUpdatedProduct(productName) {
    return this.state.updatedProducts.find(product => product.name === productName);
  }

  buildTabs() {
    const { products, fetchCapabilities, esMonitoringUrl, updateData } = this.props;
    const { checkingMigrationStatus } = this.state;

    const tabs = products.map(product => {
      const status = getProductStatus(product);
      const updatedProduct = this.findUpdatedProduct(product.name);

      let instructions = null;
      if (status.showInstructions) {
        const instructionSteps = getInstructionSteps(product.name, {
          doneWithMigration: async () => {
            this.setState({ activeTabId: 'overview' });
            this.props.setCapabilitiesFetchingPaused(false);
            await updateData();
            this.props.setCapabilitiesFetchingPaused(true);
          },
          updatedProduct,
          kibanaUrl: '',
          esMonitoringUrl,
          checkForMigrationStatus: async () => {
            this.setState({ checkingMigrationStatus: true });
            this.props.setCapabilitiesFetchingPaused(false);
            const updatedProducts = await fetchCapabilities();
            this.props.setCapabilitiesFetchingPaused(true);
            this.setState({ checkingMigrationStatus: false, updatedProducts }, () => this.buildTabs());
          },
          checkingMigrationStatus,
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

    this.setState({ tabs });
  }

  // componentWillReceiveProps(nextProps) {
  //   if (nextProps.products && this.props.products) {
  //     if (!isEqual(nextProps.products, this.props.products)) {
  //       console.log(1);
  //       this.setState({
  //         tabs: buildTabs({
  //           products: this.props.products,
  //           updatedProducts: nextProps.updatedProducts,
  //           changeTab: this.changeTab,
  //           instructionOpts: nextProps.instructionOpts
  //         })
  //       });
  //     } else if (nextProps.checkedMigrationStatus) {
  //       console.log(2);
  //       this.setState({
  //         tabs: buildTabs({
  //           products: this.props.products,
  //           updatedProducts: this.props.products, // It's the same but the code will handle showing a message like "no data found yet" since this is for the Check Data call
  //           changeTab: this.changeTab,
  //           instructionOpts: nextProps.instructionOpts
  //         })
  //       });
  //     }
  //   }
  // }

  changeTab = tabId => this.setState({ activeTabId: tabId })

  render() {
    const { activeTabId, tabs } = this.state;

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
