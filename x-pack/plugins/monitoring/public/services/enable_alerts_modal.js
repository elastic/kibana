/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function enableAlertsModalProvider($http, $window) {
  function shouldShowAlertsModal() {
    const modalHasBeenShown = $window.sessionStorage.getItem('ALERTS_MODAL_HAS_BEEN_SHOWN');

    const decisionMade = $window.localStorage.getItem('ALERTS_MODAL_DECISION_MADE');

    if (!modalHasBeenShown && !decisionMade) {
      return true;
    }

    return false;
  }

  function enableAlerts() {
    // TODO: handle errors
    $http.post('../api/monitoring/v1/alerts/enable', {});
    $window.localStorage.setItem('ALERTS_MODAL_DECISION_MADE', true);
  }

  function notAskAgain() {
    $window.localStorage.setItem('ALERTS_MODAL_DECISION_MADE', true);
  }

  function hideModalForSession() {
    $window.sessionStorage.setItem('ALERTS_MODAL_HAS_BEEN_SHOWN', true);
  }

  return {
    shouldShowAlertsModal,
    enableAlerts,
    notAskAgain,
    hideModalForSession,
  };
}
