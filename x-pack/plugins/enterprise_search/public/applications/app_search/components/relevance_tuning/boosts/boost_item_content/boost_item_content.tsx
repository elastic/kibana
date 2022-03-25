/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiButton, EuiFormRow, EuiPanel, EuiRange, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RelevanceTuningLogic } from '../..';
import { Boost, BoostType, FunctionalBoost, ProximityBoost, ValueBoost } from '../../types';

import { FunctionalBoostForm } from './functional_boost_form';
import { ProximityBoostForm } from './proximity_boost_form';
import { ValueBoostForm } from './value_boost_form';

interface Props {
  boost: Boost;
  index: number;
  name: string;
}

export const BoostItemContent: React.FC<Props> = ({ boost, index, name }) => {
  const { deleteBoost, updateBoostFactor } = useActions(RelevanceTuningLogic);
  const { type } = boost;

  const getBoostForm = () => {
    switch (type) {
      case BoostType.Value:
        return <ValueBoostForm boost={boost as ValueBoost} index={index} name={name} />;
      case BoostType.Functional:
        return <FunctionalBoostForm boost={boost as FunctionalBoost} index={index} name={name} />;
      case BoostType.Proximity:
        return <ProximityBoostForm boost={boost as ProximityBoost} index={index} name={name} />;
    }
  };

  return (
    <EuiPanel color="subdued" paddingSize="none" className="relevanceTuningAccordionItem">
      <EuiSpacer size="m" />
      {getBoostForm()}
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.impactLabel',
          {
            defaultMessage: 'Impact',
          }
        )}
        fullWidth
      >
        <EuiRange
          min={0}
          max={10}
          step={0.1}
          value={boost.factor}
          onChange={(e) =>
            updateBoostFactor(
              name,
              index,
              parseFloat((e as React.ChangeEvent<HTMLInputElement>).target.value)
            )
          }
          showInput
          compressed
          fullWidth
        />
      </EuiFormRow>
      <EuiButton color="danger" iconType="cross" size="s" onClick={() => deleteBoost(name, index)}>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.deleteBoostButtonLabel',
          {
            defaultMessage: 'Delete boost',
          }
        )}
      </EuiButton>
    </EuiPanel>
  );
};
