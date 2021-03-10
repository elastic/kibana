/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { useFieldChooserContext } from '../../../field_chooser_context';
import { useForm } from '../../../../../../../../shared_imports';

import { FieldChooser as FieldChooserView, Props as FieldChooserViewProps } from './field_chooser';

import { CustomFieldForm } from './types';

type Props = Omit<
  FieldChooserViewProps,
  'customFieldForm' | 'indexPattern' | 'onIndexPatternChange' | 'currentTab' | 'onCurrentTabChange'
>;

export const FieldChooser: FunctionComponent<Props> = (props) => {
  const { indexPattern, updateIndexPattern, currentTab, setCurrentTab } = useFieldChooserContext();
  const { form } = useForm<CustomFieldForm>();
  return (
    <FieldChooserView
      {...props}
      customFieldForm={form}
      indexPattern={indexPattern}
      onIndexPatternChange={updateIndexPattern}
      currentTab={currentTab}
      onCurrentTabChange={setCurrentTab}
    />
  );
};
