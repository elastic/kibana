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
    status.showInstanceList = true;
  }
  else if (product.isNetNewUser) {
    status.label = 'Product not found.';
    status.icon = 'questionInCircle';
    status.color = 'primary';
    status.stepStatus = 'incomplete';
  }
  else if (product.isPartiallyMigrated) {
    status.showInstructions = true;
    status.showInstanceList = true;

    if (product.fullyMigratedButNeedsToDisableLegacy) {
      status.label = `We see migrated data, but we also see legacy data. Make sure to disable legacy collection on all instances!`;
      status.icon = 'branch';
      status.color = 'warning';
      status.stepStatus = 'warning';
    } else {
      status.label = `Found ${product.fullyMigratedUuids.length} migrated instances,
      ${product.internalCollectorsUuids.length} unmigrated instances
      and ${product.partiallyMigratedUuids.length} partially migrated instances.`;
      status.icon = 'branch';
      status.color = 'warning';
      status.stepStatus = 'warning';
    }
  }

  return status;
};
