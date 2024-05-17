/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '@kbn/core/public';
import React from 'react';

import { getLinks } from '../../lib';
import { RuntimeField } from '../../types';
import { Props as FormProps, RuntimeFieldForm } from '../runtime_field_form/runtime_field_form';

export interface Props {
  docLinks: DocLinksStart;
  defaultValue?: RuntimeField;
  onChange?: FormProps['onChange'];
  ctx?: FormProps['ctx'];
}

export const RuntimeFieldEditor = ({ defaultValue, onChange, docLinks, ctx }: Props) => {
  const links = getLinks(docLinks);

  return (
    <RuntimeFieldForm links={links} defaultValue={defaultValue} onChange={onChange} ctx={ctx} />
  );
};
