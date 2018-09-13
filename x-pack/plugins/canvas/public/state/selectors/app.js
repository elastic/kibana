import { get } from 'lodash';

// page getters
export function getEditing(state) {
  return get(state, 'transient.editing', false);
}

export function getFullscreen(state) {
  return get(state, 'transient.fullscreen', false);
}

export function getFunctionDefinitions(state) {
  return get(state, 'app.functionDefinitions');
}

export function getAppReady(state) {
  return get(state, 'app.ready');
}

export function getBasePath(state) {
  return get(state, 'app.basePath');
}

export function getReportingBrowserType(state) {
  return get(state, 'app.reportingBrowserType');
}

// return true only when the required parameters are in the state
export function isAppReady(state) {
  const appReady = getAppReady(state);
  return appReady === true;
}
