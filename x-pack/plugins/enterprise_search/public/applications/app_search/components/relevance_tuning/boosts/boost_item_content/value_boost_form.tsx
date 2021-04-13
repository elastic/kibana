/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RelevanceTuningLogic } from '../..';
import { ValueBoost } from '../../types';

interface Props {
  boost: ValueBoost;
  index: number;
  name: string;
}

export const ValueBoostForm: React.FC<Props> = ({ boost, index, name }) => {
  const { updateBoostValue, removeBoostValue, addBoostValue } = useActions(RelevanceTuningLogic);
  const values = boost.value;

  return (
    <>
      {values.map((value, valueIndex) => (
        <EuiFlexGroup key={valueIndex} alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              value={value}
              fullWidth
              onChange={(e) => updateBoostValue(name, index, valueIndex, e.target.value)}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.value.valueNameAriaLabel',
                {
                  defaultMessage: 'Value name',
                }
              )}
              autoFocus
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              onClick={() => removeBoostValue(name, index, valueIndex)}
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.value.removeValueAriaLabel',
                {
                  defaultMessage: 'Remove value',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={() => addBoostValue(name, index)}>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.value.addValueButtonLabel',
          {
            defaultMessage: 'Add value',
          }
        )}
      </EuiButton>
    </>
  );
};
