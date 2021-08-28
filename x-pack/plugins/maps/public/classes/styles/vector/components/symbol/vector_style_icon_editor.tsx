/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  IconDynamicOptions,
  IconStaticOptions,
} from '../../../../../../common/descriptor_types/style_property_descriptor_types';
import type { Props } from '../style_prop_editor';
import { StylePropEditor } from '../style_prop_editor';
// @ts-expect-error
import { DynamicIconForm } from './dynamic_icon_form';
// @ts-expect-error
import { StaticIconForm } from './static_icon_form';


type IconEditorProps = Omit<Props<IconStaticOptions, IconDynamicOptions>, 'children'>;

export function VectorStyleIconEditor(props: IconEditorProps) {
  const iconForm = props.styleProperty.isDynamic() ? (
    <DynamicIconForm {...props} />
  ) : (
    <StaticIconForm {...props} />
  );

  return <StylePropEditor {...props}>{iconForm}</StylePropEditor>;
}
