import expect from 'expect.js';
import { rowCount } from '../rowCount';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { emptyTable, testTable } from './fixtures/test_tables';

describe('rowCount', () => {
  const fn = functionWrapper(rowCount);

  it('returns the number of rows in the datatable', () => {
    expect(fn(testTable)).to.equal(testTable.rows.length);
    expect(fn(emptyTable)).to.equal(0);
  });
});
