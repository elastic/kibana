import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const sort = () => ({
  name: 'sort',
  displayName: 'Datatable Sorting',
  args: [
    {
      name: '_',
      displayName: 'Sort Field',
      argType: 'datacolumn',
    },
    {
      name: 'reverse',
      displayName: 'Descending',
      argType: 'toggle',
    },
  ],
  resolve({ context }) {
    if (getState(context) === 'ready') {
      return { columns: get(getValue(context), 'columns', []) };
    }
    return { columns: [] };
  },
});
