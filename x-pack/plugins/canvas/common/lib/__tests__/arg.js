import expect from 'expect.js';
import { Arg } from '../arg';

describe('Arg', () => {
  it('sets required to false by default', () => {
    const isOptional = new Arg({
      name: 'optional_me',
    });
    expect(isOptional.required).to.equal(false);

    const isRequired = new Arg({
      name: 'require_me',
      required: true,
    });
    expect(isRequired.required).to.equal(true);
  });
});
