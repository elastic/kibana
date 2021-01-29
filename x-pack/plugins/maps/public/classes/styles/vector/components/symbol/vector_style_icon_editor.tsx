/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Props, StylePropEditor } from '../style_prop_editor';
// @ts-expect-error
import { DynamicIconForm } from './dynamic_icon_form';
// @ts-expect-error
import { StaticIconForm } from './static_icon_form';
import { IconDynamicOptions, IconStaticOptions } from '../../../../../../common/descriptor_types';

type IconEditorProps = Omit<Props<IconStaticOptions, IconDynamicOptions>, 'children'>;

export function VectorStyleIconEditor(props: IconEditorProps) {
  const iconForm = props.styleProperty.isDynamic() ? (
    <DynamicIconForm {...props} />
  ) : (
    <StaticIconForm {...props} />
  );

  return <StylePropEditor {...props}>{iconForm}</StylePropEditor>;
}
