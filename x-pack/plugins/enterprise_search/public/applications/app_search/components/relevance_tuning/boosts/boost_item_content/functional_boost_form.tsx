/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { RelevanceTuningLogic } from '../..';
import {
  BOOST_OPERATION_DISPLAY_MAP,
  FUNCTIONAL_BOOST_FUNCTION_DISPLAY_MAP,
} from '../../constants';
import {
  FunctionalBoost,
  BoostFunction,
  BoostOperation,
  BoostType,
  FunctionalBoostFunction,
} from '../../types';

interface Props {
  boost: FunctionalBoost;
  index: number;
  name: string;
}

const functionOptions = Object.values(FunctionalBoostFunction).map((boostFunction) => ({
  value: boostFunction,
  text: FUNCTIONAL_BOOST_FUNCTION_DISPLAY_MAP[boostFunction as FunctionalBoostFunction],
}));

const operationOptions = Object.values(BoostOperation).map((boostOperation) => ({
  value: boostOperation,
  text: BOOST_OPERATION_DISPLAY_MAP[boostOperation],
}));

export const FunctionalBoostForm: React.FC<Props> = ({ boost, index, name }) => {
  const { updateBoostSelectOption } = useActions(RelevanceTuningLogic);
  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.funtional.functionDropDownLabel',
          {
            defaultMessage: 'Function',
          }
        )}
        fullWidth
      >
        <EuiSelect
          name={`function-${BoostType.Functional}${index}`}
          options={functionOptions}
          value={boost.function}
          onChange={(e) =>
            updateBoostSelectOption(name, index, 'function', e.target.value as BoostFunction)
          }
          fullWidth
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.funtional.operationDropDownLabel',
          {
            defaultMessage: 'Operation',
          }
        )}
        fullWidth
      >
        <EuiSelect
          name={`operation-${BoostType.Functional}${index}`}
          options={operationOptions}
          value={boost.operation}
          onChange={(e) =>
            updateBoostSelectOption(name, index, 'operation', e.target.value as BoostOperation)
          }
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};
