/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { uniq, sortBy, isEqual } from 'lodash';

import { RuleDiffTab } from '../rule_diff_tab';
import { savedRuleMock } from '../../../logic/mock';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { COLORS } from './constants';

/*
  Finds an element with a text content that exactly matches the passed argument.
  Handly because React Testing Library's doesn't provide an easy way to search by
  text if the text is split into multiple DOM elements.
*/
function findChildByTextContent(parent: Element, textContent: string): HTMLElement {
  return Array.from(parent.querySelectorAll('*')).find(
    (childElement) => childElement.textContent === textContent
  ) as HTMLElement;
}

/*
  Finds a diff line element (".diff-line") that contains a particular text content.
  Match doesn't have to be exact, it's enough for the line to include the text.
*/
function findDiffLineContaining(text: string): Element | null {
  const foundLine = Array.from(document.querySelectorAll('.diff-line')).find((element) =>
    (element.textContent || '').includes(text)
  );

  return foundLine || null;
}

describe('Rule upgrade workflow: viewing rule changes in JSON diff view', () => {
  it.each(['light', 'dark'] as const)(
    'User can see precisely how property values would change after upgrade - %s theme',
    (colorMode) => {
      const oldRule: RuleResponse = {
        ...savedRuleMock,
      };

      const newRule: RuleResponse = {
        ...savedRuleMock,
      };

      /* Changes to test line update */
      oldRule.version = 1;
      newRule.version = 2;

      /* Changes to test line removal */
      oldRule.author = ['Alice', 'Bob', 'Charlie'];
      newRule.author = ['Alice', 'Charlie'];

      /* Changes to test line addition */
      delete oldRule.license;
      newRule.license = 'GPLv3';

      const ThemeWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
        <EuiThemeProvider colorMode={colorMode}>{children}</EuiThemeProvider>
      );

      const { container } = render(<RuleDiffTab oldRule={oldRule} newRule={newRule} />, {
        wrapper: ThemeWrapper,
      });

      /* LINE UPDATE */
      const updatedLine = findChildByTextContent(container, '-  "version": 1+  "version": 2');

      const updatedLineBefore = findChildByTextContent(updatedLine, '  "version": 1');
      expect(updatedLineBefore).toHaveStyle(
        `background: ${COLORS[colorMode].lineBackground.deletion}`
      );

      const updatedWordBefore = findChildByTextContent(updatedLineBefore, '1');
      expect(updatedWordBefore).toHaveStyle(
        `background: ${COLORS[colorMode].characterBackground.deletion}`
      );

      const updatedLineAfter = findChildByTextContent(updatedLine, '  "version": 2');
      expect(updatedLineAfter).toHaveStyle(
        `background: ${COLORS[colorMode].lineBackground.insertion}`
      );

      const updatedWordAfter = findChildByTextContent(updatedLineAfter, '2');
      expect(updatedWordAfter).toHaveStyle(
        `background: ${COLORS[colorMode].characterBackground.insertion}`
      );

      /* LINE REMOVAL */
      const removedLine = findChildByTextContent(container, '-    "Bob",');

      const removedLineBefore = findChildByTextContent(removedLine, '    "Bob",');
      expect(removedLineBefore).toHaveStyle(
        `background: ${COLORS[colorMode].lineBackground.deletion}`
      );

      const removedLineAfter = findChildByTextContent(removedLine, '');
      expect(window.getComputedStyle(removedLineAfter).backgroundColor).toBe('');

      /* LINE ADDITION */
      const addedLine = findChildByTextContent(container, '+  "license": "GPLv3",');

      const addedLineBefore = findChildByTextContent(addedLine, '');
      expect(window.getComputedStyle(addedLineBefore).backgroundColor).toBe('');

      const addedLineAfter = findChildByTextContent(addedLine, '  "license": "GPLv3",');
      expect(addedLineAfter).toHaveStyle(
        `background: ${COLORS[colorMode].lineBackground.insertion}`
      );
    }
  );

  it('Rule actions and exception lists should not be shown as modified', () => {
    const testAction = {
      group: 'default',
      id: 'my-action-id',
      params: { body: '{"test": true}' },
      action_type_id: '.webhook',
      uuid: '1ef8f105-7d0d-434c-9ba1-2e053edddea8',
      frequency: {
        summary: true,
        notifyWhen: 'onActiveAlert',
        throttle: null,
      },
    } as const;

    const testExceptionListItem = {
      id: 'acbbbd86-7973-40a4-bc83-9e926c7f1e59',
      list_id: '1e51e9b9-b7c0-4a11-8785-55f740b9938a',
      type: 'rule_default',
      namespace_type: 'single',
    } as const;

    const oldRule: RuleResponse = {
      ...savedRuleMock,
      version: 1,
      actions: [testAction],
    };

    const newRule: RuleResponse = {
      ...savedRuleMock,
      version: 2,
    };

    /* Case: rule update doesn't have "actions" or "exception_list" properties */
    const { rerender } = render(<RuleDiffTab oldRule={oldRule} newRule={newRule} />);
    expect(screen.queryAllByText('"actions":', { exact: false })).toHaveLength(0);

    /* Case: rule update has "actions" and "exception_list" equal to empty arrays */
    rerender(
      <RuleDiffTab
        oldRule={{ ...oldRule }}
        newRule={{ ...newRule, actions: [], exceptions_list: [] }}
      />
    );
    expect(screen.queryAllByText('"actions":', { exact: false })).toHaveLength(0);

    /* Case: rule update has an action and an exception list item */
    rerender(
      <RuleDiffTab
        oldRule={{ ...oldRule }}
        newRule={{
          ...newRule,
          actions: [{ ...testAction, id: 'my-other-action' }],
          exceptions_list: [testExceptionListItem],
        }}
      />
    );
    expect(screen.queryAllByText('"actions":', { exact: false })).toHaveLength(0);
  });

  describe('Technical properties should not be included in preview', () => {
    it.each(['revision', 'created_at', 'created_by', 'updated_at', 'updated_by'])(
      'Should not include "%s" in preview',
      (property) => {
        const oldRule: RuleResponse = {
          ...savedRuleMock,
          version: 1,
          revision: 100,
          created_at: '12/31/2023T23:59:000z',
          created_by: 'mockUserOne',
          updated_at: '01/01/2024T00:00:000z',
          updated_by: 'mockUserTwo',
        };

        const newRule: RuleResponse = {
          ...savedRuleMock,
          version: 2,
          revision: 1,
          created_at: '12/31/2023T23:59:999z',
          created_by: 'mockUserOne',
          updated_at: '02/02/2024T00:00:001z',
          updated_by: 'mockUserThree',
        };

        render(<RuleDiffTab oldRule={oldRule} newRule={newRule} />);
        expect(screen.queryAllByText(property, { exact: false })).toHaveLength(0);
      }
    );
  });

  it('Properties with semantically equal values should not be shown as modified', () => {
    const oldRule: RuleResponse = {
      ...savedRuleMock,
      version: 1,
    };

    const newRule: RuleResponse = {
      ...savedRuleMock,
      version: 2,
    };

    /* DURATION */
    /* Semantically equal durations should not be shown as modified */
    const { rerender } = render(
      <RuleDiffTab
        oldRule={{ ...oldRule, from: 'now-1h' }}
        newRule={{ ...newRule, from: 'now-60m' }}
      />
    );
    expect(findDiffLineContaining('"from":')).toBeNull();

    rerender(
      <RuleDiffTab
        oldRule={{ ...oldRule, from: 'now-1h' }}
        newRule={{ ...newRule, from: 'now-3600s' }}
      />
    );
    expect(findDiffLineContaining('"from":')).toBeNull();

    rerender(
      <RuleDiffTab
        oldRule={{ ...oldRule, from: 'now-7200s' }}
        newRule={{ ...newRule, from: 'now-2h' }}
      />
    );
    expect(findDiffLineContaining('"from":')).toBeNull();

    /* Semantically different durations should generate diff */
    rerender(
      <RuleDiffTab
        oldRule={{ ...oldRule, from: 'now-7260s' }}
        newRule={{ ...newRule, from: 'now-2h' }}
      />
    );
    expect(findDiffLineContaining('-  "from": "now-7260s",+  "from": "now-7200s",')).not.toBeNull();

    /* NOTE - Investigation guide */
    rerender(<RuleDiffTab oldRule={{ ...oldRule, note: '' }} newRule={{ ...newRule }} />);
    expect(findDiffLineContaining('"note":')).toBeNull();

    rerender(
      <RuleDiffTab oldRule={{ ...oldRule, note: '' }} newRule={{ ...newRule, note: undefined }} />
    );
    expect(findDiffLineContaining('"note":')).toBeNull();

    rerender(<RuleDiffTab oldRule={{ ...oldRule }} newRule={{ ...newRule, note: '' }} />);
    expect(findDiffLineContaining('"note":')).toBeNull();

    rerender(<RuleDiffTab oldRule={{ ...oldRule }} newRule={{ ...newRule, note: 'abc' }} />);
    expect(findDiffLineContaining('-  "note": "",+  "note": "abc",')).not.toBeNull();
  });

  it('Unchanged sections of a rule should be hidden by default', async () => {
    const oldRule: RuleResponse = {
      ...savedRuleMock,
      version: 1,
    };

    const newRule: RuleResponse = {
      ...savedRuleMock,
      version: 2,
    };

    render(<RuleDiffTab oldRule={oldRule} newRule={newRule} />);
    expect(screen.queryAllByText('"author":', { exact: false })).toHaveLength(0);
    expect(screen.queryAllByText('Expand 44 unchanged lines')).toHaveLength(1);

    await userEvent.click(screen.getByText('Expand 44 unchanged lines'));

    expect(screen.queryAllByText('Expand 44 unchanged lines')).toHaveLength(0);
    expect(screen.queryAllByText('"author":', { exact: false })).toHaveLength(2);
  });

  it('Properties should be sorted alphabetically', async () => {
    const oldRule: RuleResponse = {
      ...savedRuleMock,
      version: 1,
    };

    const newRule: RuleResponse = {
      ...savedRuleMock,
      version: 2,
    };

    function checkRenderedPropertyNamesAreSorted(): boolean {
      /* Find all lines which contain property names in the diff */
      const matchedElements = screen.queryAllByText(/\s".*?":/, { trim: false });

      /* Extract property names from the matched elements */
      const propertyNames = matchedElements.map((element) => {
        const matches = element.textContent?.match(/\s"(.*?)":/);
        return matches ? matches[1] : '';
      });

      /* Remove duplicates */
      const uniquePropertyNames = uniq(propertyNames);

      /* Check that displayed property names are sorted alphabetically */
      const isArraySortedAlphabetically = (array: string[]): boolean =>
        isEqual(array, sortBy(array));

      return isArraySortedAlphabetically(uniquePropertyNames);
    }

    render(<RuleDiffTab oldRule={oldRule} newRule={newRule} />);
    const arePropertiesSortedInConciseView = checkRenderedPropertyNamesAreSorted();
    expect(arePropertiesSortedInConciseView).toBe(true);

    await userEvent.click(screen.getByText('Expand 44 unchanged lines'));
    const arePropertiesSortedInExpandedView = checkRenderedPropertyNamesAreSorted();
    expect(arePropertiesSortedInExpandedView).toBe(true);
  });
});
