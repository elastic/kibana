/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataMappingPopover } from './data_mapping_popover';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';

type Props = {
  fieldMetaOptions: FieldMetaOptions;
  onChange: (updatedOptions: unknown) => void;
  switchDisabled: boolean;
};

export function CategoricalDataMappingPopover(props: Props) {
  const onIsEnabledChange = (event: EuiSwitchEvent) => {
    props.onChange({
      fieldMetaOptions: {
        ...props.fieldMetaOptions,
        isEnabled: event.target.checked,
      },
    });
  };

  return (
    <DataMappingPopover>
      <EuiFormRow display="columnCompressedSwitch">
        <EuiSwitch
          label={i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.categoricalLabel', {
            defaultMessage: 'Get categories from data set',
          })}
          checked={props.fieldMetaOptions.isEnabled}
          onChange={onIsEnabledChange}
          compressed
          disabled={props.switchDisabled}
        />
      </EuiFormRow>
    </DataMappingPopover>
  );
}
