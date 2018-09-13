import React from 'react';
import expect from 'expect.js';
import { render } from 'enzyme';
import { Download } from '../';

describe('<Download />', () => {
  it('has canvas_download class', () => {
    const wrapper = render(
      <Download fileName="hello" content="world">
        <button>Download it</button>
      </Download>
    );

    expect(wrapper.hasClass('canvas_download')).to.be.ok;
  });
});
