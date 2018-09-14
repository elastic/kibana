import expect from 'expect.js';
import { parse } from 'tinymath';
import { getFieldNames } from '../pointseries/lib/get_field_names';

describe('getFieldNames', () => {
  it('returns array of field names referenced in a parsed math object', () => {
    expect(getFieldNames([], parse('2+3'))).to.be.eql([]);
    expect(getFieldNames([], parse('mean(foo)'))).to.be.eql(['foo']);
    expect(getFieldNames([], parse('max(foo + bar)'))).to.be.eql(['foo', 'bar']);
    expect(getFieldNames([], parse('count(foo) + count(bar)'))).to.be.eql(['foo', 'bar']);
    expect(
      getFieldNames([], parse('sum(count(foo),count(bar),count(fizz),count(buzz),2,3,4)'))
    ).to.be.eql(['foo', 'bar', 'fizz', 'buzz']);
  });
});
