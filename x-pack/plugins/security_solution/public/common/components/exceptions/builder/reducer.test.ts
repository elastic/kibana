/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../../../../lists/common/schemas/types/entry_match.mock';
import { getEntryNestedMock } from '../../../../../../lists/common/schemas/types/entry_nested.mock';
import { getEntryListMock } from '../../../../../../lists/common/schemas/types/entry_list.mock';

import { ExceptionsBuilderExceptionItem } from '../types';
import { Action, State, exceptionsBuilderReducer } from './reducer';
import { getDefaultEmptyEntry } from './helpers';

const initialState: State = {
  disableAnd: false,
  disableNested: false,
  disableOr: false,
  andLogicIncluded: false,
  addNested: false,
  exceptions: [],
  exceptionsToDelete: [],
  errorExists: 0,
};

describe('exceptionsBuilderReducer', () => {
  let reducer: (state: State, action: Action) => State;

  beforeEach(() => {
    reducer = exceptionsBuilderReducer();
  });

  describe('#setExceptions', () => {
    test('should return "andLogicIncluded" ', () => {
      const update = reducer(initialState, {
        type: 'setExceptions',
        exceptions: [],
      });

      expect(update).toEqual({
        disableAnd: false,
        disableNested: false,
        disableOr: false,
        andLogicIncluded: false,
        addNested: false,
        exceptions: [],
        exceptionsToDelete: [],
        errorExists: 0,
      });
    });

    test('should set "andLogicIncluded" to true if any of the exceptions include entries with length greater than 1 ', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryMatchMock()],
        },
      ];
      const { andLogicIncluded } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(andLogicIncluded).toBeTruthy();
    });

    test('should set "andLogicIncluded" to false if any of the exceptions include entries with length greater than 1 ', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock()],
        },
      ];
      const { andLogicIncluded } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(andLogicIncluded).toBeFalsy();
    });

    test('should set "addNested" to true if last exception entry is type nested', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryNestedMock()],
        },
      ];
      const { addNested } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(addNested).toBeTruthy();
    });

    test('should set "addNested" to false if last exception item entry is not type nested', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryNestedMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock()],
        },
      ];
      const { addNested } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(addNested).toBeFalsy();
    });

    test('should set "disableOr" to true if last exception entry is type nested', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryNestedMock()],
        },
      ];
      const { disableOr } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(disableOr).toBeTruthy();
    });

    test('should set "disableOr" to false if last exception item entry is not type nested', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryNestedMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock()],
        },
      ];
      const { disableOr } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(disableOr).toBeFalsy();
    });

    test('should set "disableNested" to true if an exception item includes an entry of type list', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryListMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryNestedMock()],
        },
      ];
      const { disableNested } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(disableNested).toBeTruthy();
    });

    test('should set "disableNested" to false if an exception item does not include an entry of type list', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryNestedMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock()],
        },
      ];
      const { disableNested } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(disableNested).toBeFalsy();
    });

    // What does that even mean?! :) Just checking if a user has selected
    // to add a nested entry but has not yet selected the nested field
    test('should set "disableAnd" to true if last exception item is a nested entry with no entries itself', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryListMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), { ...getEntryNestedMock(), entries: [] }],
        },
      ];
      const { disableAnd } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(disableAnd).toBeTruthy();
    });

    test('should set "disableAnd" to false if last exception item is a nested entry with no entries itself', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock(), getEntryNestedMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [getEntryMatchMock()],
        },
      ];
      const { disableAnd } = reducer(initialState, {
        type: 'setExceptions',
        exceptions,
      });

      expect(disableAnd).toBeFalsy();
    });
  });

  describe('#setDefault', () => {
    test('should restore initial state and add default empty entry to item" ', () => {
      const update = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setDefault',
          initialState,
          lastException: {
            ...getExceptionListItemSchemaMock(),
            entries: [],
          },
        }
      );

      expect(update).toEqual({
        ...initialState,
        exceptions: [
          {
            ...getExceptionListItemSchemaMock(),
            entries: [getDefaultEmptyEntry()],
          },
        ],
      });
    });
  });

  describe('#setExceptionsToDelete', () => {
    test('should add passed in exception item to "exceptionsToDelete"', () => {
      const exceptions: ExceptionsBuilderExceptionItem[] = [
        {
          ...getExceptionListItemSchemaMock(),
          id: '1',
          entries: [getEntryListMock()],
        },
        {
          ...getExceptionListItemSchemaMock(),
          id: '2',
          entries: [getEntryMatchMock(), { ...getEntryNestedMock(), entries: [] }],
        },
      ];
      const { exceptionsToDelete } = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions,
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setExceptionsToDelete',
          exceptions: [
            {
              ...getExceptionListItemSchemaMock(),
              id: '1',
              entries: [getEntryListMock()],
            },
          ],
        }
      );

      expect(exceptionsToDelete).toEqual([
        {
          ...getExceptionListItemSchemaMock(),
          id: '1',
          entries: [getEntryListMock()],
        },
      ]);
    });
  });

  describe('#setDisableAnd', () => {
    test('should set "disableAnd" to false if "action.shouldDisable" is false', () => {
      const { disableAnd } = reducer(
        {
          disableAnd: true,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setDisableAnd',
          shouldDisable: false,
        }
      );

      expect(disableAnd).toBeFalsy();
    });

    test('should set "disableAnd" to true if "action.shouldDisable" is true', () => {
      const { disableAnd } = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setDisableAnd',
          shouldDisable: true,
        }
      );

      expect(disableAnd).toBeTruthy();
    });
  });

  describe('#setDisableOr', () => {
    test('should set "disableOr" to false if "action.shouldDisable" is false', () => {
      const { disableOr } = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: true,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setDisableOr',
          shouldDisable: false,
        }
      );

      expect(disableOr).toBeFalsy();
    });

    test('should set "disableOr" to true if "action.shouldDisable" is true', () => {
      const { disableOr } = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setDisableOr',
          shouldDisable: true,
        }
      );

      expect(disableOr).toBeTruthy();
    });
  });

  describe('#setAddNested', () => {
    test('should set "addNested" to false if "action.addNested" is false', () => {
      const { addNested } = reducer(
        {
          disableAnd: false,
          disableNested: true,
          disableOr: false,
          andLogicIncluded: true,
          addNested: true,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setAddNested',
          addNested: false,
        }
      );

      expect(addNested).toBeFalsy();
    });

    test('should set "disableOr" to true if "action.addNested" is true', () => {
      const { addNested } = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setAddNested',
          addNested: true,
        }
      );

      expect(addNested).toBeTruthy();
    });
  });

  describe('#setErrorsExist', () => {
    test('should increase "errorExists" by one if payload is "true"', () => {
      const { errorExists } = reducer(
        {
          disableAnd: false,
          disableNested: true,
          disableOr: false,
          andLogicIncluded: true,
          addNested: true,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setErrorsExist',
          errorExists: true,
        }
      );

      expect(errorExists).toEqual(1);
    });

    test('should decrease "errorExists" by one if payload is "false"', () => {
      const { errorExists } = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 1,
        },
        {
          type: 'setErrorsExist',
          errorExists: false,
        }
      );

      expect(errorExists).toEqual(0);
    });

    test('should not decrease "errorExists" if decreasing would dip into negative numbers', () => {
      const { errorExists } = reducer(
        {
          disableAnd: false,
          disableNested: false,
          disableOr: false,
          andLogicIncluded: true,
          addNested: false,
          exceptions: [getExceptionListItemSchemaMock()],
          exceptionsToDelete: [],
          errorExists: 0,
        },
        {
          type: 'setErrorsExist',
          errorExists: false,
        }
      );

      expect(errorExists).toEqual(0);
    });
  });
});
