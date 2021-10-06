/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { showAlertsToast } from '../../alerts/lib/alerts_toast';
import { useRequestErrorHandler } from './use_request_error_handler';

export const useAlertsModal = () => {
  const { services } = useKibana();
  const handleRequestError = useRequestErrorHandler();

  function shouldShowAlertsModal(alerts: {}) {
    const modalHasBeenShown =
      window.sessionStorage.getItem('ALERTS_MODAL_HAS_BEEN_SHOWN') === 'true';
    const decisionMade = window.localStorage.getItem('ALERTS_MODAL_DECISION_MADE') === 'true';

    if (Object.keys(alerts).length > 0) {
      window.localStorage.setItem('ALERTS_MODAL_DECISION_MADE', 'true');
      return false;
    } else if (!modalHasBeenShown && !decisionMade) {
      return true;
    }

    return false;
  }

  async function enableAlerts() {
    try {
      const response = await services.http?.post('../api/monitoring/v1/alerts/enable', {});
      window.localStorage.setItem('ALERTS_MODAL_DECISION_MADE', 'true');
      showAlertsToast(response);
    } catch (err) {
      await handleRequestError(err);
    }
  }

  function notAskAgain() {
    window.localStorage.setItem('ALERTS_MODAL_DECISION_MADE', 'true');
  }

  function hideModalForSession() {
    window.sessionStorage.setItem('ALERTS_MODAL_HAS_BEEN_SHOWN', 'true');
  }

  return {
    shouldShowAlertsModal,
    enableAlerts,
    notAskAgain,
    hideModalForSession,
  };
};
