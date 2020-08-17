/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldMetaPopover } from './field_meta_popover';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';

type Props = {
  fieldMetaOptions: FieldMetaOptions;
  onChange: (fieldMetaOptions: FieldMetaOptions) => void;
};

export function CategoricalFieldMetaPopover(props: Props) {
  const onIsEnabledChange = (event: EuiSwitchEvent) => {
    props.onChange({
      ...props.fieldMetaOptions,
      isEnabled: event.target.checked,
    });
  };

  return (
    <FieldMetaPopover>
      <EuiFormRow display="columnCompressedSwitch">
        <EuiSwitch
          label={i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.categoricalLabel', {
            defaultMessage: 'Get categories from indices',
          })}
          checked={props.fieldMetaOptions.isEnabled}
          onChange={onIsEnabledChange}
          compressed
        />
      </EuiFormRow>
    </FieldMetaPopover>
  );
}
