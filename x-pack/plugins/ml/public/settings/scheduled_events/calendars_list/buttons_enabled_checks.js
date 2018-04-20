/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export function buttonsEnabledChecks(permissions, createPermissionFailureMessage, mlNodesAvailable) {
  const NO_ML_NODES_ERROR = 'No ML nodes available';

  function newButtonWrapperClass() {
    return (permissions.canCreateCalendar && mlNodesAvailable) ? 'button-wrapper' : ['button-wrapper', 'disabled'];
  }

  function newButtonWrapperTooltip() {
    let tooltip = undefined;
    if (permissions.canCreateCalendar === false) {
      tooltip = createPermissionFailureMessage('canCreateCalendar');
    } else if (mlNodesAvailable ===  false) {
      tooltip = NO_ML_NODES_ERROR;
    }
    return tooltip;
  }

  function newButtonDisabled() {
    return (
      (permissions.canCreateCalendar === false) || mlNodesAvailable === false
    );
  }

  function deleteButtonWrapperClass() {
    return (permissions.canDeleteCalendar && mlNodesAvailable) ? 'button-wrapper' : ['button-wrapper', 'disabled'];
  }

  function deleteButtonWrapperTooltip() {
    let tooltip = undefined;
    if (permissions.canDeleteCalendar === false) {
      tooltip = createPermissionFailureMessage('canDeleteCalendar');
    } else if (mlNodesAvailable ===  false) {
      tooltip = NO_ML_NODES_ERROR;
    }
    return tooltip;
  }

  function deleteButtonDisabled() {
    return (permissions.canDeleteCalendar && mlNodesAvailable) === false;
  }

  return {
    newButtonWrapperClass,
    newButtonWrapperTooltip,
    newButtonDisabled,
    deleteButtonWrapperClass,
    deleteButtonWrapperTooltip,
    deleteButtonDisabled,
  };
}
