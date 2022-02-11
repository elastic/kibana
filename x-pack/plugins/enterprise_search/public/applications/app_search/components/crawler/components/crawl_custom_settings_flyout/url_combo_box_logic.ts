/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

export interface UrlComboBoxValues {
  isInvalid: boolean;
}

export interface UrlComboBoxActions {
  setIsInvalid(isInvalid: boolean): { isInvalid: boolean };
}

export const UrlComboBoxLogic = kea<MakeLogicType<UrlComboBoxValues, UrlComboBoxActions>>({
  key: (props) => props.id,
  path: (key: string) => ['enterprise_search', 'app_search', 'url_combo_box', key],
  actions: () => ({
    setIsInvalid: (isInvalid) => ({ isInvalid }),
  }),
  reducers: () => ({
    isInvalid: [
      false,
      {
        setIsInvalid: (_, { isInvalid }) => isInvalid,
      },
    ],
  }),
});
