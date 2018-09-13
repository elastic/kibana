import expect from 'expect.js';
import { unquoteString } from '../unquote_string';

describe('unquoteString', () => {
  it('removes double quotes', () => {
    expect(unquoteString('"hello world"')).to.equal('hello world');
  });

  it('removes single quotes', () => {
    expect(unquoteString("'hello world'")).to.equal('hello world');
  });

  it('returns unquoted strings', () => {
    expect(unquoteString('hello world')).to.equal('hello world');
    expect(unquoteString('hello')).to.equal('hello');
    expect(unquoteString('hello"world')).to.equal('hello"world');
    expect(unquoteString("hello'world")).to.equal("hello'world");
    expect(unquoteString("'hello'world")).to.equal("'hello'world");
    expect(unquoteString('"hello"world')).to.equal('"hello"world');
  });
});
