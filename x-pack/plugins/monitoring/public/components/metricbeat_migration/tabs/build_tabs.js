/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { getProductStatus } from './get_product_status';
import { getInstructionSteps } from '../instruction_steps';
import { getProductLabel } from './get_product_label';
import {
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiSteps,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

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


export const buildTabs = (products, instructionOpts) => {
  const tabs = products.map(product => {
    const status = getProductStatus(product);//, null, monitoringUrl);

    let instructions = null;
    if (status.showInstructions) {
      instructions = (
        <Fragment>
          <EuiSpacer size="m"/>
          {getProductMigrationLabel(product)}
          <EuiPanel>
            <EuiSteps steps={getInstructionSteps(product.name, instructionOpts)}/>
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
    if (product.totalInstanceCount > 0) {
      const status = getProductStatus(product, () => {
        return this.setState({ activeProductTab: this.findTabById(product.name) });
      });

      let action;
      if (status.showInstructions) {
        action = (
          <EuiButton onClick={action}>
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
};
