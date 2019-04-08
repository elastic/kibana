/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import { uniq } from 'lodash';
import {
  EuiTabbedContent,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiSteps,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiIcon,
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
    isShowingMigrationSteps: false,
  }

  buildTabs() {
    const { products, esMonitoringUrl, updateProduct } = this.props;
    const { checkingMigrationStatus, hasCheckedMigrationStatus, isShowingMigrationSteps } = this.state;

    const tabs = products.map(product => {
      const status = getProductStatus(product);

      let instructions = null;
      if (status.showInstructions && isShowingMigrationSteps) {
        const instructionSteps = getInstructionSteps(product, {
          doneWithMigration: async () => {
            await updateProduct();
            this.setState({ activeTabId: 'overview' });
          },
          kibanaUrl: '',
          esMonitoringUrl,
          checkForMigrationStatus: async () => {
            this.setState({ checkingMigrationStatus: true });
            await updateProduct();
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

      let instanceList = null;
      if (status.showInstanceList) {
        const instances = [
          ...uniq(product.internalCollectorsUuids || []).map(uuid => ({
            uuid,
            status: 'unmigrated'
          })),
          ...uniq(product.fullyMigratedUuids || []).map(uuid => ({
            uuid,
            status: 'migrated'
          })),
          ...uniq(product.partiallyMigratedUuids || []).map(uuid => ({
            uuid,
            status: 'partial'
          }))
        ];

        if (instances.length) {
          instanceList = (
            <Fragment>
              <EuiSpacer size="m"/>
              <EuiInMemoryTable
                items={instances}
                columns={[
                  {
                    field: 'status',
                    name: 'Status',
                    width: '100px',
                    sortable: true,
                    render: status => {
                      if (status === 'unmigrated') {
                        return <EuiIcon type="cross" color="danger"/>;
                      }
                      if (status === 'partial') {
                        return <EuiIcon type="alert" color="warning"/>;
                      }
                      return <EuiIcon type="check" color="secondary"/>;
                    }
                  },
                  {
                    field: 'uuid',
                    name: 'UUID',
                    sortable: true,
                  },
                  {
                    name: 'Action',
                    render: () => {
                      return (
                        <EuiButton
                          onClick={() => this.setState({ isShowingMigrationSteps: true })}
                          color="danger"
                        >
                          Migrate
                        </EuiButton>
                      );
                    }
                  }
                ]}
                sorting={true}
                pagination={true}
              />
              <EuiSpacer size="m"/>
            </Fragment>
          );
        }
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
            {instanceList}
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
