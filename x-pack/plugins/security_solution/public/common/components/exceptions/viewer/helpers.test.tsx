/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import { getFormattedEntries, formatEntry, getDescriptionListContent } from './helpers';
import { FormattedEntry } from '../types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getEntriesArrayMock } from '@kbn/lists-plugin/common/schemas/types/entries.mock';
import { getEntryMatchMock } from '@kbn/lists-plugin/common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '@kbn/lists-plugin/common/schemas/types/entry_match_any.mock';
import { getEntryExistsMock } from '@kbn/lists-plugin/common/schemas/types/entry_exists.mock';

describe('Exception viewer helpers', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  describe('#getFormattedEntries', () => {
    test('it returns empty array if no entries passed', () => {
      const result = getFormattedEntries([]);

      expect(result).toEqual([]);
    });

    test('it formats nested entries as expected', () => {
      const payload = [getEntryMatchMock()];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is',
          value: 'some host name',
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats "exists" entries as expected', () => {
      const payload = [getEntryExistsMock()];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'exists',
          value: undefined,
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats non-nested entries as expected', () => {
      const payload = [getEntryMatchAnyMock(), getEntryMatchMock()];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is one of',
          value: ['some host name'],
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is',
          value: 'some host name',
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats a mix of nested and non-nested entries as expected', () => {
      const payload = getEntriesArrayMock();
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is',
          value: 'some host name',
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is one of',
          value: ['some host name'],
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'exists',
          value: undefined,
        },
        {
          fieldName: 'parent.field',
          isNested: false,
          operator: undefined,
          value: undefined,
        },
        {
          fieldName: 'host.name',
          isNested: true,
          operator: 'is',
          value: 'some host name',
        },
        {
          fieldName: 'host.name',
          isNested: true,
          operator: 'is one of',
          value: ['some host name'],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#formatEntry', () => {
    test('it formats an entry', () => {
      const payload = getEntryMatchMock();
      const formattedEntry = formatEntry({ isNested: false, item: payload });
      const expected: FormattedEntry = {
        fieldName: 'host.name',
        isNested: false,
        operator: 'is',
        value: 'some host name',
      };

      expect(formattedEntry).toEqual(expected);
    });

    test('it formats as expected when "isNested" is "true"', () => {
      const payload = getEntryMatchMock();
      const formattedEntry = formatEntry({ isNested: true, item: payload });
      const expected: FormattedEntry = {
        fieldName: 'host.name',
        isNested: true,
        operator: 'is',
        value: 'some host name',
      };

      expect(formattedEntry).toEqual(expected);
    });
  });

  describe('#getDescriptionListContent', () => {
    test('it returns formatted description list with os if one is specified', () => {
      const payload = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      payload.description = '';
      const result = getDescriptionListContent(payload);
      const os = result.find(({ title }) => title === 'OS');

      expect(os).toMatchInlineSnapshot(`
        Object {
          "description": <EuiToolTip
            anchorClassName="eventFiltersDescriptionListDescription"
            content="Linux"
            delay="regular"
            display="inlineBlock"
            position="top"
          >
            <EuiDescriptionListDescription
              className="eui-fullWidth"
            >
              Linux
            </EuiDescriptionListDescription>
          </EuiToolTip>,
          "title": "OS",
        }
      `);
    });

    test('it returns formatted description list with a description if one specified', () => {
      const payload = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      payload.description = 'Im a description';
      const result = getDescriptionListContent(payload);
      const description = result.find(({ title }) => title === 'Description');

      expect(description).toMatchInlineSnapshot(`
        Object {
          "description": <EuiToolTip
            anchorClassName="eventFiltersDescriptionListDescription"
            content="Im a description"
            delay="regular"
            display="inlineBlock"
            position="top"
          >
            <EuiDescriptionListDescription
              className="eui-fullWidth"
            >
              Im a description
            </EuiDescriptionListDescription>
          </EuiToolTip>,
          "title": "Description",
        }
      `);
    });

    test('it returns scrolling element when description is longer than 75 charachters', () => {
      const payload = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      payload.description =
        'Puppy kitty ipsum dolor sit good dog foot stick canary. Teeth Mittens grooming vaccine walk swimming nest good boy furry tongue heel furry treats fish. Cage run fast kitten dinnertime ball run foot park fleas throw house train licks stick dinnertime window. Yawn litter fish yawn toy pet gate throw Buddy kitty wag tail ball groom crate ferret heel wet nose Rover toys pet supplies. Bird Food treats tongue lick teeth ferret litter box slobbery litter box crate bird small animals yawn small animals shake slobber gimme five toys polydactyl meow. ';
      const result = getDescriptionListContent(payload);
      const description = result.find(({ title }) => title === 'Description');

      expect(description).toMatchInlineSnapshot(`
        Object {
          "description": <EuiDescriptionListDescription
            style={
              Object {
                "height": 150,
                "overflowY": "hidden",
              }
            }
          >
            <EuiText
              aria-label=""
              className="eui-yScrollWithShadows"
              role="region"
              size="s"
              tabIndex={0}
            >
              Puppy kitty ipsum dolor sit good dog foot stick canary. Teeth Mittens grooming vaccine walk swimming nest good boy furry tongue heel furry treats fish. Cage run fast kitten dinnertime ball run foot park fleas throw house train licks stick dinnertime window. Yawn litter fish yawn toy pet gate throw Buddy kitty wag tail ball groom crate ferret heel wet nose Rover toys pet supplies. Bird Food treats tongue lick teeth ferret litter box slobbery litter box crate bird small animals yawn small animals shake slobber gimme five toys polydactyl meow. 
            </EuiText>
          </EuiDescriptionListDescription>,
          "title": "Description",
        }
      `);
    });

    test('it returns just user and date created if no other fields specified', () => {
      const payload = getExceptionListItemSchemaMock();
      payload.description = '';
      const result = getDescriptionListContent(payload);
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "description": <EuiToolTip
              anchorClassName="eventFiltersDescriptionListDescription"
              content="April 20th 2020 @ 15:25:31"
              delay="regular"
              display="inlineBlock"
              position="top"
            >
              <EuiDescriptionListDescription
                className="eui-fullWidth"
              >
                April 20th 2020 @ 15:25:31
              </EuiDescriptionListDescription>
            </EuiToolTip>,
            "title": "Date created",
          },
          Object {
            "description": <EuiToolTip
              anchorClassName="eventFiltersDescriptionListDescription"
              content="some user"
              delay="regular"
              display="inlineBlock"
              position="top"
            >
              <EuiDescriptionListDescription
                className="eui-fullWidth"
              >
                some user
              </EuiDescriptionListDescription>
            </EuiToolTip>,
            "title": "Created by",
          },
        ]
      `);
    });

    test('it returns Modified By/On info when `includeModified` is true', () => {
      const result = getDescriptionListContent(
        getExceptionListItemSchemaMock({ os_types: ['linux'] }),
        true
      );
      const dateModified = result.find(({ title }) => title === 'Date modified');
      const modifiedBy = result.find(({ title }) => title === 'Modified by');
      expect(modifiedBy).toMatchInlineSnapshot(`
        Object {
          "description": <EuiToolTip
            anchorClassName="eventFiltersDescriptionListDescription"
            content="some user"
            delay="regular"
            display="inlineBlock"
            position="top"
          >
            <EuiDescriptionListDescription
              className="eui-fullWidth"
            >
              some user
            </EuiDescriptionListDescription>
          </EuiToolTip>,
          "title": "Modified by",
        }
      `);
      expect(dateModified).toMatchInlineSnapshot(`
        Object {
          "description": <EuiToolTip
            anchorClassName="eventFiltersDescriptionListDescription"
            content="April 20th 2020 @ 15:25:31"
            delay="regular"
            display="inlineBlock"
            position="top"
          >
            <EuiDescriptionListDescription
              className="eui-fullWidth"
            >
              April 20th 2020 @ 15:25:31
            </EuiDescriptionListDescription>
          </EuiToolTip>,
          "title": "Date modified",
        }
      `);
    });

    test('it returns Name when `includeName` is true', () => {
      const result = getDescriptionListContent(
        getExceptionListItemSchemaMock({ os_types: ['linux'] }),
        false,
        true
      );
      const name = result.find(({ title }) => title === 'Name');
      expect(name).toMatchInlineSnapshot(`
        Object {
          "description": <EuiToolTip
            anchorClassName="eventFiltersDescriptionListDescription"
            content="some name"
            delay="regular"
            display="inlineBlock"
            position="top"
          >
            <EuiDescriptionListDescription
              className="eui-fullWidth"
            >
              some name
            </EuiDescriptionListDescription>
          </EuiToolTip>,
          "title": "Name",
        }
      `);
    });
  });
});
