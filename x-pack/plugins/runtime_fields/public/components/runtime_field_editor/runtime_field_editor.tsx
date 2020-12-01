/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DocLinksStart } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';

import { RuntimeField } from '../../types';
import { getLinks } from '../../lib';
import {
  RuntimeFieldForm,
  Props as FormProps,
  Context as FormContext,
} from '../runtime_field_form/runtime_field_form';
import { PreviewField, Props as PreviewFieldProps } from '../preview_field/preview_field';

interface Context extends FormContext {
  /**
   * The index or indices to search with the current runtime field
   * (e.g. searching on that index or defining a runtime field on an
   * index template for that index pattern).
   * If no index is provided the "Preview field" section is disabled.
   */
  index?: PreviewFieldProps['index'];
  /** Current search request body context.*/
  searchRequestBody?: PreviewFieldProps['searchRequestBody'];
  /**
   * Data plugin start "search" service.
   * If it is not provided, the "Preview field" section is disabled.
   */
  search?: DataPublicPluginStart['search'];
}

export interface Props {
  docLinks: DocLinksStart;
  defaultValue?: RuntimeField;
  onChange?: FormProps['onChange'];
  ctx?: Context;
}

export const RuntimeFieldEditor = ({ defaultValue, onChange, docLinks, ctx }: Props) => {
  const links = getLinks(docLinks);

  return (
    <RuntimeFieldForm links={links} defaultValue={defaultValue} onChange={onChange} ctx={ctx} />
  );
};
