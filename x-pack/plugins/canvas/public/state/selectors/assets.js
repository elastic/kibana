import { get } from 'lodash';

const assetRoot = 'assets';

export function getAssets(state) {
  return get(state, assetRoot, {});
}

export function getAssetIds(state) {
  return Object.keys(getAssets(state));
}

export function getAssetById(state, id) {
  return get(state, [assetRoot, id]);
}
