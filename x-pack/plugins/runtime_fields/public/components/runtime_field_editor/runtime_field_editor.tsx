/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DocLinksStart } from 'src/core/public';

import { RuntimeField } from '../../types';
import { getLinks } from '../../lib';
import { RuntimeFieldForm, Props as FormProps } from '../runtime_field_form/runtime_field_form';

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
