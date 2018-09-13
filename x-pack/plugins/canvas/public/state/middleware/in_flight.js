import { convert } from '../../lib/modify_path';
import { setLoading, setValue, inFlightActive, inFlightComplete } from '../actions/resolved_args';

export const inFlight = ({ dispatch }) => next => {
  const pendingCache = [];

  return action => {
    const isLoading = action.type === setLoading.toString();
    const isSetting = action.type === setValue.toString();

    if (isLoading || isSetting) {
      const cacheKey = convert(action.payload.path).join('/');

      if (isLoading) {
        pendingCache.push(cacheKey);
        dispatch(inFlightActive());
      } else if (isSetting) {
        const idx = pendingCache.indexOf(cacheKey);
        pendingCache.splice(idx, 1);
        if (pendingCache.length === 0) dispatch(inFlightComplete());
      }
    }

    // execute the action
    next(action);
  };
};
