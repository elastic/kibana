/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { getFilterItemObjListFromControlInput } from './utils';
import { initialInputData } from './mocks/data';

describe('utils', () => {
  describe('getFilterItemObjListFromControlOutput', () => {
    it('should return ordered filterItem where passed in order', () => {
      const filterItemObjList = getFilterItemObjListFromControlInput(
        initialInputData as ControlGroupInput
      );

      filterItemObjList.forEach((item, idx) => {
        const panelObj =
          initialInputData.panels[String(idx) as keyof typeof initialInputData.panels]
            .explicitInput;
        expect(item).toMatchObject({
          fieldName: panelObj.fieldName,
          selectedOptions: panelObj.selectedOptions,
          title: panelObj.title,
          existsSelected: panelObj.existsSelected,
          exclude: panelObj.exclude,
        });
      });
    });

    it('should return ordered filterItem where NOT passed in order', () => {
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['3'],
          '1': initialInputData.panels['0'],
        },
      };
      const filterItemObjList = getFilterItemObjListFromControlInput(
        newInputData as ControlGroupInput
      );

      let panelObj = newInputData.panels['1'].explicitInput;
      expect(filterItemObjList[0]).toMatchObject({
        fieldName: panelObj.fieldName,
        selectedOptions: panelObj.selectedOptions,
        title: panelObj.title,
        existsSelected: panelObj.existsSelected,
        exclude: panelObj.exclude,
      });

      panelObj = newInputData.panels['0'].explicitInput;
      expect(filterItemObjList[1]).toMatchObject({
        fieldName: panelObj.fieldName,
        selectedOptions: panelObj.selectedOptions,
        title: panelObj.title,
        existsSelected: panelObj.existsSelected,
        exclude: panelObj.exclude,
      });
    });
  });
});
