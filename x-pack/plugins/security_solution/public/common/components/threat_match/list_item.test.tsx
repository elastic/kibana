/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { useKibana } from '../../../common/lib/kibana';
import { fields } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';

import { ListItemComponent } from './list_item';
import { ThreatMapEntries } from './types';
import { IndexPattern } from 'src/plugins/data/public';

jest.mock('../../../common/lib/kibana');

const singlePayload = (): ThreatMapEntries => ({
  entries: [
    {
      field: 'field.one',
      type: 'mapping',
      value: 'field.one',
    },
  ],
});

const doublePayload = (): ThreatMapEntries => ({
  entries: [
    {
      field: 'field.one',
      type: 'mapping',
      value: 'field.one',
    },
    {
      field: 'field.two',
      type: 'mapping',
      value: 'field.two',
    },
  ],
});

describe('ListItemComponent', () => {
  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['field.one', 'field.two']);

  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          autocomplete: {
            getValueSuggestions: getValueSuggestionsMock,
          },
        },
      },
    });
  });

  afterEach(() => {
    getValueSuggestionsMock.mockClear();
  });

  describe('and badge logic', () => {
    test('it renders "and" badge with extra top padding for the first item when "andLogicIncluded" is "true"', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <ListItemComponent
            listItem={doublePayload()}
            listId={'123'}
            listItemIndex={0}
            indexPattern={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
            threatIndexPatterns={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
            andLogicIncluded={true}
            isOnlyItem={false}
            onDeleteEntryItem={jest.fn()}
            onChangeEntryItem={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="entryItemEntryFirstRowAndBadge"]').exists()
      ).toBeTruthy();
    });

    test('it renders "and" badge when more than one item entry exists and it is not the first item', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <ListItemComponent
            listItem={doublePayload()}
            listId={'123'}
            listItemIndex={1}
            indexPattern={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
            andLogicIncluded={true}
            isOnlyItem={false}
            onDeleteEntryItem={jest.fn()}
            onChangeEntryItem={jest.fn()}
            threatIndexPatterns={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="entryItemEntryAndBadge"]').exists()).toBeTruthy();
    });

    test('it renders indented "and" badge when "andLogicIncluded" is "true" and only one entry exists', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <ListItemComponent
            listItem={singlePayload()}
            listId={'123'}
            listItemIndex={1}
            indexPattern={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
            threatIndexPatterns={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
            andLogicIncluded={true}
            isOnlyItem={false}
            onDeleteEntryItem={jest.fn()}
            onChangeEntryItem={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="entryItemEntryInvisibleAndBadge"]').exists()
      ).toBeTruthy();
    });

    test('it renders no "and" badge when "andLogicIncluded" is "false"', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <ListItemComponent
            listItem={singlePayload()}
            listId={'123'}
            listItemIndex={1}
            indexPattern={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
            threatIndexPatterns={
              {
                id: '1234',
                title: 'logstash-*',
                fields,
              } as IndexPattern
            }
            andLogicIncluded={false}
            isOnlyItem={false}
            onDeleteEntryItem={jest.fn()}
            onChangeEntryItem={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="entryItemEntryInvisibleAndBadge"]').exists()
      ).toBeFalsy();
      expect(wrapper.find('[data-test-subj="entryItemEntryAndBadge"]').exists()).toBeFalsy();
      expect(
        wrapper.find('[data-test-subj="entryItemEntryFirstRowAndBadge"]').exists()
      ).toBeFalsy();
    });
  });

  describe('delete button logic', () => {
    test('it renders delete button disabled when it is only entry left', () => {
      const item: ThreatMapEntries = {
        entries: [{ ...singlePayload(), field: '', type: 'mapping', value: '' }],
      };
      const wrapper = mount(
        <ListItemComponent
          listItem={item}
          listId={'123'}
          listItemIndex={0}
          indexPattern={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          threatIndexPatterns={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          andLogicIncluded={false}
          isOnlyItem={true}
          onDeleteEntryItem={jest.fn()}
          onChangeEntryItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="itemEntryDeleteButton"] button').props().disabled
      ).toBeTruthy();
    });

    test('it does not render delete button disabled when it is not the only entry left', () => {
      const wrapper = mount(
        <ListItemComponent
          listItem={singlePayload()}
          listId={'123'}
          listItemIndex={0}
          indexPattern={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          threatIndexPatterns={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          andLogicIncluded={false}
          isOnlyItem={false}
          onDeleteEntryItem={jest.fn()}
          onChangeEntryItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="itemEntryDeleteButton"] button').props().disabled
      ).toBeFalsy();
    });

    test('it does not render delete button disabled when "entryItemIndex" is not "0"', () => {
      const wrapper = mount(
        <ListItemComponent
          listItem={singlePayload()}
          listId={'123'}
          listItemIndex={1}
          indexPattern={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          threatIndexPatterns={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          andLogicIncluded={false}
          // if entryItemIndex is not 0, wouldn't make sense for
          // this to be true, but done for testing purposes
          isOnlyItem={true}
          onDeleteEntryItem={jest.fn()}
          onChangeEntryItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="itemEntryDeleteButton"] button').props().disabled
      ).toBeFalsy();
    });

    test('it does not render delete button disabled when more than one entry exists', () => {
      const wrapper = mount(
        <ListItemComponent
          listItem={doublePayload()}
          listId={'123'}
          listItemIndex={0}
          indexPattern={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          threatIndexPatterns={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          andLogicIncluded={false}
          isOnlyItem={true}
          onDeleteEntryItem={jest.fn()}
          onChangeEntryItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="itemEntryDeleteButton"] button').at(0).props().disabled
      ).toBeFalsy();
    });

    test('it invokes "onChangeEntryItem" when delete button clicked', () => {
      const mockOnDeleteEntryItem = jest.fn();
      const wrapper = mount(
        <ListItemComponent
          listItem={doublePayload()}
          listId={'123'}
          listItemIndex={0}
          indexPattern={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          threatIndexPatterns={
            {
              id: '1234',
              title: 'logstash-*',
              fields,
            } as IndexPattern
          }
          andLogicIncluded={false}
          isOnlyItem={true}
          onDeleteEntryItem={mockOnDeleteEntryItem}
          onChangeEntryItem={jest.fn()}
        />
      );

      wrapper.find('[data-test-subj="itemEntryDeleteButton"] button').at(0).simulate('click');

      const expected: ThreatMapEntries = {
        entries: [
          {
            field: 'field.two',
            type: 'mapping',
            value: 'field.two',
          },
        ],
      };

      expect(mockOnDeleteEntryItem).toHaveBeenCalledWith(expected, 0);
    });
  });
});
