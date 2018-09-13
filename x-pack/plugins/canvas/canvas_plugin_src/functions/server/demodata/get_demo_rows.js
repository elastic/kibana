import { cloneDeep } from 'lodash';
import ci from './ci.json';
import shirts from './shirts.json';

export function getDemoRows(arg) {
  if (arg === 'ci') return cloneDeep(ci);
  if (arg === 'shirts') return cloneDeep(shirts);
  throw new Error(`Invalid data set: ${arg}, use 'ci' or 'shirts'.`);
}
