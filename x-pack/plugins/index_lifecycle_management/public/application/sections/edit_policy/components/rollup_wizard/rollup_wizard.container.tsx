/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { get } from 'lodash';

import { useFormData, FormHook } from '../../../../../shared_imports';
import { RollupWizard as RollupWizardView, Props as RollupWizardViewProps } from './rollup_wizard';

type Props = Omit<RollupWizardViewProps, 'value'> & { form: FormHook };

export const RollupWizard: FunctionComponent<Props> = ({ phase, form, ...rest }) => {
  const path = `phases.${phase}.actions.rollup`;
  const [data] = useFormData({ form, watch: path });
  const value = get(data, path);
  return <RollupWizardView value={value} phase={phase} {...rest} />;
};
