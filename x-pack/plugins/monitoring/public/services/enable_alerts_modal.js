/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function enableAlertsModalProvider($http, $window) {
  let hasBeenShown = false;

  function shouldShowAlertsModal() {
    const showAlertsModal = $window.localStorage.getItem(
      'STACK_MONITORING_SHOW_ALERTS_MODAL',
      false
    );
    if (!hasBeenShown && (showAlertsModal || showAlertsModal === null)) {
      return true;
    }

    return false;
  }

  function enableAlerts() {
    // TODO: handle errors
    $http.post('../api/monitoring/v1/alerts/enable', {});
    $window.localStorage.setItem('STACK_MONITORING_SHOW_ALERTS_MODAL', false);
  }

  function notAskAgain() {
    $window.localStorage.setItem('STACK_MONITORING_SHOW_ALERTS_MODAL', false);
  }

  function hideModalForSession() {
    hasBeenShown = true;
  }

  return {
    shouldShowAlertsModal,
    enableAlerts,
    notAskAgain,
    hideModalForSession,
  };
}
