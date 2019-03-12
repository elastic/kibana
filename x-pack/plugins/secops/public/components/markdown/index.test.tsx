/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { Markdown } from '.';

describe('Markdown', () => {
  test(`it renders when raw markdown is NOT provided`, () => {
    const wrapper = mount(<Markdown />);

    expect(wrapper.find('[data-test-subj="markdown"]').exists()).toEqual(true);
  });

  test('it renders plain text', () => {
    const raw = 'this has no special markdown formatting';
    const wrapper = mount(<Markdown raw={raw} />);

    expect(
      wrapper
        .find('[data-test-subj="markdown-root"]')
        .first()
        .text()
    ).toEqual(raw);
  });

  test('it applies the EUI text style to all markdown content', () => {
    const wrapper = mount(<Markdown raw={'#markdown'} />);

    expect(
      wrapper
        .find('[data-test-subj="markdown-root"]')
        .first()
        .childAt(0)
        .hasClass('euiText')
    ).toBe(true);
  });

  describe('markdown tables', () => {
    const headerColumns = ['we', 'support', 'markdown', 'tables'];
    const header = `| ${headerColumns[0]} | ${headerColumns[1]} | ${headerColumns[2]} | ${
      headerColumns[3]
    } |`;

    const rawTable = `${header}\n|---------|---------|------------|--------|\n| because | tables  | are        | pretty |\n| useful  | for     | formatting | data   |`;

    test('it applies EUI table styling to tables', () => {
      const wrapper = mount(<Markdown raw={rawTable} />);

      expect(
        wrapper
          .find('table')
          .first()
          .childAt(0)
          .hasClass('euiTable')
      ).toBe(true);
    });

    headerColumns.forEach(headerText => {
      test(`it renders the "${headerText}" table header`, () => {
        const wrapper = mount(<Markdown raw={rawTable} />);

        expect(
          wrapper
            .find('[data-test-subj="markdown-table-header"]')
            .first()
            .text()
        ).toContain(headerText);
      });
    });

    test('it applies EUI table styling to table rows', () => {
      const wrapper = mount(<Markdown raw={rawTable} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-table-row"]')
          .first()
          .childAt(0)
          .hasClass('euiTableRow')
      ).toBe(true);
    });

    test('it applies EUI table styling to table cells', () => {
      const wrapper = mount(<Markdown raw={rawTable} />);

      expect(
        wrapper
          .find('[data-test-subj="markdown-table-cell"]')
          .first()
          .childAt(0)
          .hasClass('euiTableRowCell')
      ).toBe(true);
    });

    test('it renders the expected table content', () => {
      const wrapper = shallow(<Markdown raw={rawTable} />);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
