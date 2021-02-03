/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useActions } from 'kea';
import {
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiSuperSelect,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { TEXT } from '../../../../../../shared/constants/field_types';
import { SchemaTypes } from '../../../../../../shared/types';

import {
  FUNCTIONAL,
  FUNCTIONAL_DISPLAY,
  PROXIMITY,
  PROXIMITY_DISPLAY,
  VALUE,
  VALUE_DISPLAY,
} from '../../../constants';
import { BoostIcon } from '../../../boost_icon';
import { RelevanceTuningLogic } from '../../../relevance_tuning_logic';
import { BoostType } from '../../../types';

import './boosts.scss';

const BASE_OPTIONS = [
  {
    value: 'add-boost',
    inputDisplay: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.addBoostDropDownOptionLabel',
      {
        defaultMessage: 'Add boost',
      }
    ),
    disabled: true,
  },
  {
    value: FUNCTIONAL,
    inputDisplay: (
      <>
        <BoostIcon type={FUNCTIONAL} />
        {FUNCTIONAL_DISPLAY}
      </>
    ),
  },
  {
    value: PROXIMITY,
    inputDisplay: (
      <>
        <BoostIcon type={PROXIMITY} />
        {PROXIMITY_DISPLAY}
      </>
    ),
  },
  {
    value: VALUE,
    inputDisplay: (
      <>
        <BoostIcon type={VALUE} />
        {VALUE_DISPLAY}
      </>
    ),
  },
];

const filterInvalidOptions = (value: BoostType, type: SchemaTypes) => {
  // Proximity and Functional boost types are not valid for text fields
  if (type === TEXT && [PROXIMITY, FUNCTIONAL].includes(value)) return false;
  return true;
};

interface Props {
  name: string;
  type: SchemaTypes;
}

export const Boosts: React.FC<Props> = ({ name, type }) => {
  const { addBoost } = useActions(RelevanceTuningLogic);

  const addBoostClick = (value: BoostType) => {
    addBoost(name, value);
  };

  const selectOptions = useMemo(
    () => BASE_OPTIONS.filter((option) => filterInvalidOptions(option.value as BoostType, type)),
    [type]
  );

  return (
    <EuiPageContent>
      <EuiPageContentHeader responsive={false}>
        <EuiPageContentHeaderSection>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.title',
                {
                  defaultMessage: 'Boosts',
                }
              )}
            </h4>
          </EuiTitle>
        </EuiPageContentHeaderSection>
        <EuiPageContentHeaderSection>
          <EuiSuperSelect
            className="boostSelect"
            itemClassName="boostSelectOption"
            valueOfSelected={'add-boost'}
            options={selectOptions}
            onChange={(value) => addBoostClick(value as BoostType)}
          />
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
    </EuiPageContent>
  );
};
