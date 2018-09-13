import expect from 'expect.js';
import { isColumnReference } from '../pointseries/lib/is_column_reference';

describe('isColumnReference', () => {
  it('get a string result after parsing math expression', () => {
    expect(isColumnReference('field')).to.be(true);
  });
  it('non-string', () => {
    expect(isColumnReference('2')).to.be(false);
    expect(isColumnReference('mean(field)')).to.be(false);
    expect(isColumnReference('field * 3')).to.be(false);
  });
});
