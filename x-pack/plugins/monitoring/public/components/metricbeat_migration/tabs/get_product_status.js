/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getProductStatus = product => {
  const status = {
    label: '',
    icon: '',
    color: '',
    stepStatus: '',
    showInstructions: false
  };

  if (product.isFullyMigrated) {
    status.label = `All ${product.fullyMigratedUuids.length} instances are fully migrated.`;
    status.icon = 'check';
    status.color = 'success';
    status.stepStatus = 'complete';
  }
  else if (product.isInternalCollector) {
    status.label = `Found ${product.internalCollectorsUuids.length} instances that need to be migrated.`;
    status.icon = 'cross';
    status.color = 'danger';
    status.stepStatus = 'danger';
    status.showInstructions = true;
    // status.action = (
    //   <EuiButton onClick={action}>Fix</EuiButton>
    // );
  }
  else if (product.isNetNewUser) {
    status.label = 'Product not found.';
    status.icon = 'questionInCircle';
    status.color = 'primary';
    status.stepStatus = 'incomplete';
  }
  else if (product.isPartiallyUpgraded) {
    status.label = `Found ${product.fullyMigratedUuids.length} migrated
    instances and ${product.internalCollectorsUuids.length} unmigrated instance`;
    status.icon = 'branch';
    status.color = 'warning';
    status.stepStatus = 'warning';
  }

  return status;
};
