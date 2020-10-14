/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { useKibana } from '../../../../common/lib/kibana';
import { fields } from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../../../../lists/common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '../../../../../../lists/common/schemas/types/entry_match_any.mock';

import { BuilderExceptionListItemComponent } from './exception_item';

jest.mock('../../../../common/lib/kibana');

describe('BuilderExceptionListItemComponent', () => {
  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['value 1', 'value 2']);

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
    test('it renders "and" badge with extra top padding for the first exception item when "andLogicIncluded" is "true"', () => {
      const exceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [getEntryMatchMock(), getEntryMatchMock()],
      };
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <BuilderExceptionListItemComponent
            exceptionItem={exceptionItem}
            exceptionId={'123'}
            exceptionItemIndex={0}
            indexPattern={{
              id: '1234',
              title: 'logstash-*',
              fields,
            }}
            andLogicIncluded={true}
            isOnlyItem={false}
            listType="detection"
            setErrorsExist={jest.fn()}
            onDeleteExceptionItem={jest.fn()}
            onChangeExceptionItem={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
      ).toBeTruthy();
    });

    test('it renders "and" badge when more than one exception item entry exists and it is not the first exception item', () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [getEntryMatchMock(), getEntryMatchMock()];
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <BuilderExceptionListItemComponent
            exceptionItem={exceptionItem}
            exceptionId={'123'}
            exceptionItemIndex={1}
            indexPattern={{
              id: '1234',
              title: 'logstash-*',
              fields,
            }}
            andLogicIncluded={true}
            isOnlyItem={false}
            listType="detection"
            setErrorsExist={jest.fn()}
            onDeleteExceptionItem={jest.fn()}
            onChangeExceptionItem={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="exceptionItemEntryAndBadge"]').exists()).toBeTruthy();
    });

    test('it renders indented "and" badge when "andLogicIncluded" is "true" and only one entry exists', () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [getEntryMatchMock()];
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <BuilderExceptionListItemComponent
            exceptionItem={exceptionItem}
            exceptionId={'123'}
            exceptionItemIndex={1}
            indexPattern={{
              id: '1234',
              title: 'logstash-*',
              fields,
            }}
            andLogicIncluded={true}
            isOnlyItem={false}
            listType="detection"
            setErrorsExist={jest.fn()}
            onDeleteExceptionItem={jest.fn()}
            onChangeExceptionItem={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="exceptionItemEntryInvisibleAndBadge"]').exists()
      ).toBeTruthy();
    });

    test('it renders no "and" badge when "andLogicIncluded" is "false"', () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [getEntryMatchMock()];
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
          <BuilderExceptionListItemComponent
            exceptionItem={exceptionItem}
            exceptionId={'123'}
            exceptionItemIndex={1}
            indexPattern={{
              id: '1234',
              title: 'logstash-*',
              fields,
            }}
            andLogicIncluded={false}
            isOnlyItem={false}
            listType="detection"
            setErrorsExist={jest.fn()}
            onDeleteExceptionItem={jest.fn()}
            onChangeExceptionItem={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="exceptionItemEntryInvisibleAndBadge"]').exists()
      ).toBeFalsy();
      expect(wrapper.find('[data-test-subj="exceptionItemEntryAndBadge"]').exists()).toBeFalsy();
      expect(
        wrapper.find('[data-test-subj="exceptionItemEntryFirstRowAndBadge"]').exists()
      ).toBeFalsy();
    });
  });

  describe('delete button logic', () => {
    test('it renders delete button disabled when it is only entry left in builder', () => {
      const exceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [{ ...getEntryMatchMock(), field: '' }],
      };
      const wrapper = mount(
        <BuilderExceptionListItemComponent
          exceptionItem={exceptionItem}
          exceptionId={'123'}
          exceptionItemIndex={0}
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          andLogicIncluded={false}
          isOnlyItem={true}
          listType="detection"
          setErrorsExist={jest.fn()}
          onDeleteExceptionItem={jest.fn()}
          onChangeExceptionItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="builderItemEntryDeleteButton"] button').props().disabled
      ).toBeTruthy();
    });

    test('it does not render delete button disabled when it is not the only entry left in builder', () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [getEntryMatchMock()];

      const wrapper = mount(
        <BuilderExceptionListItemComponent
          exceptionItem={exceptionItem}
          exceptionId={'123'}
          exceptionItemIndex={0}
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          andLogicIncluded={false}
          isOnlyItem={false}
          listType="detection"
          setErrorsExist={jest.fn()}
          onDeleteExceptionItem={jest.fn()}
          onChangeExceptionItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="builderItemEntryDeleteButton"] button').props().disabled
      ).toBeFalsy();
    });

    test('it does not render delete button disabled when "exceptionItemIndex" is not "0"', () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [getEntryMatchMock()];
      const wrapper = mount(
        <BuilderExceptionListItemComponent
          exceptionItem={exceptionItem}
          exceptionId={'123'}
          exceptionItemIndex={1}
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          andLogicIncluded={false}
          // if exceptionItemIndex is not 0, wouldn't make sense for
          // this to be true, but done for testing purposes
          isOnlyItem={true}
          listType="detection"
          setErrorsExist={jest.fn()}
          onDeleteExceptionItem={jest.fn()}
          onChangeExceptionItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="builderItemEntryDeleteButton"] button').props().disabled
      ).toBeFalsy();
    });

    test('it does not render delete button disabled when more than one entry exists', () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [getEntryMatchMock(), getEntryMatchMock()];
      const wrapper = mount(
        <BuilderExceptionListItemComponent
          exceptionItem={exceptionItem}
          exceptionId={'123'}
          exceptionItemIndex={0}
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          andLogicIncluded={false}
          isOnlyItem={true}
          listType="detection"
          setErrorsExist={jest.fn()}
          onDeleteExceptionItem={jest.fn()}
          onChangeExceptionItem={jest.fn()}
        />
      );

      expect(
        wrapper.find('[data-test-subj="builderItemEntryDeleteButton"] button').at(0).props()
          .disabled
      ).toBeFalsy();
    });

    test('it invokes "onChangeExceptionItem" when delete button clicked', () => {
      const mockOnDeleteExceptionItem = jest.fn();
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [getEntryMatchMock(), getEntryMatchAnyMock()];
      const wrapper = mount(
        <BuilderExceptionListItemComponent
          exceptionItem={exceptionItem}
          exceptionId={'123'}
          exceptionItemIndex={0}
          indexPattern={{
            id: '1234',
            title: 'logstash-*',
            fields,
          }}
          andLogicIncluded={false}
          isOnlyItem={true}
          listType="detection"
          setErrorsExist={jest.fn()}
          onDeleteExceptionItem={mockOnDeleteExceptionItem}
          onChangeExceptionItem={jest.fn()}
        />
      );

      wrapper
        .find('[data-test-subj="builderItemEntryDeleteButton"] button')
        .at(0)
        .simulate('click');

      expect(mockOnDeleteExceptionItem).toHaveBeenCalledWith(
        {
          ...exceptionItem,
          entries: [getEntryMatchAnyMock()],
        },
        0
      );
    });
  });
});
