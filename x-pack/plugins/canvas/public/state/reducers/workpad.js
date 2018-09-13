import { handleActions } from 'redux-actions';
import { recentlyAccessed } from 'ui/persisted_log';
import { setWorkpad, sizeWorkpad, setColors, setName } from '../actions/workpad';
import { APP_ROUTE_WORKPAD } from '../../../common/lib/constants';

export const workpadReducer = handleActions(
  {
    [setWorkpad]: (workpadState, { payload }) => {
      recentlyAccessed.add(`${APP_ROUTE_WORKPAD}/${payload.id}`, payload.name, payload.id);
      return payload;
    },

    [sizeWorkpad]: (workpadState, { payload }) => {
      return { ...workpadState, ...payload };
    },

    [setColors]: (workpadState, { payload }) => {
      return { ...workpadState, colors: payload };
    },

    [setName]: (workpadState, { payload }) => {
      recentlyAccessed.add(`${APP_ROUTE_WORKPAD}/${workpadState.id}`, payload, workpadState.id);
      return { ...workpadState, name: payload };
    },
  },
  {}
);
