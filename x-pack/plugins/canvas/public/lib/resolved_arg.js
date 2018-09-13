import { get } from 'lodash';

export function getState(resolvedArg) {
  return get(resolvedArg, 'state', null);
}

export function getValue(resolvedArg) {
  return get(resolvedArg, 'value', null);
}

export function getError(resolvedArg) {
  if (getState(resolvedArg) !== 'error') return null;
  return get(resolvedArg, 'error', null);
}
