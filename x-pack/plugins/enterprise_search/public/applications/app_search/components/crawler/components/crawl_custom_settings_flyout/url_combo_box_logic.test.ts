/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { UrlComboBoxLogic } from './url_combo_box_logic';

describe('UrlComboBoxLogic', () => {
  const { mount } = new LogicMounter(UrlComboBoxLogic);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    const urlComboLogic = mount({}, { id: 'test id' });

    expect(urlComboLogic.values).toEqual({
      isInvalid: false,
    });
  });

  describe('actions', () => {
    describe('setIsInvalid', () => {
      it('saves the value', () => {
        const urlComboLogic = mount({}, { id: 'test id' });

        urlComboLogic.actions.setIsInvalid(true);

        expect(urlComboLogic.values.isInvalid).toEqual(true);
      });
    });
  });
});
