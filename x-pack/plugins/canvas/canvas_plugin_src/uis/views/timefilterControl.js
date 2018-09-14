import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const timefilterControl = () => ({
  name: 'timefilterControl',
  displayName: 'Time Filter',
  modelArgs: [],
  args: [
    {
      name: 'column',
      displayName: 'Column',
      help: 'Column to which selected time is applied',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { columns: [] };
    return { columns: get(getValue(context), 'columns', []) };
  },
});
