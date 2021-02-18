/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel } from '@elastic/eui';

import { SchemaTypes } from '../../../../../shared/types';

import { Boost, SearchField } from '../../types';

import { Boosts } from './boosts';
import { TextSearchToggle } from './text_search_toggle';
import { WeightSlider } from './weight_slider';

import './relevance_tuning_item_content.scss';

interface Props {
  name: string;
  type: SchemaTypes;
  boosts?: Boost[];
  field?: SearchField;
}

export const RelevanceTuningItemContent: React.FC<Props> = ({ name, type, boosts, field }) => {
  return (
    <>
      <EuiPanel hasShadow={false} className="relevanceTuningForm__itemContent">
        <TextSearchToggle name={name} type={type} field={field} />
        {field && <WeightSlider name={name} field={field} />}
      </EuiPanel>
      <Boosts name={name} type={type} boosts={boosts} />
    </>
  );
};
