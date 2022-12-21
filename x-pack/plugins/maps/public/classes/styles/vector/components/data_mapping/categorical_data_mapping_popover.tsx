/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIcon, EuiSwitch, EuiSwitchEvent, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataMappingPopover } from './data_mapping_popover';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';

interface Props<DynamicOptions> {
  fieldMetaOptions: FieldMetaOptions;
  onChange: (updatedOptions: DynamicOptions) => void;
  supportsFieldMetaFromLocalData: boolean;
}

export function CategoricalDataMappingPopover<DynamicOptions>(props: Props<DynamicOptions>) {
  const onIsEnabledChange = (event: EuiSwitchEvent) => {
    // @ts-expect-error
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
        <>
          <EuiSwitch
            label={i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.categoricalLabel', {
              defaultMessage: 'Get categories from data set',
            })}
            checked={props.fieldMetaOptions.isEnabled}
            onChange={onIsEnabledChange}
            disabled={!props.supportsFieldMetaFromLocalData}
            compressed
          />{' '}
          <EuiToolTip
            content={
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.maps.styles.categoricalDataMapping.isEnabled.server"
                    defaultMessage="Calculate categories from the entire data set. Styling is consistent when users pan, zoom, and filter."
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.maps.styles.categoricalDataMapping.isEnabled.local"
                    defaultMessage="When disabled, calculate categories from local data and recalculate categories when the data changes. Styling may be inconsistent when users pan, zoom, and filter."
                  />
                </p>
              </EuiText>
            }
          >
            <EuiIcon type="questionInCircle" color="subdued" />
          </EuiToolTip>
        </>
      </EuiFormRow>
    </DataMappingPopover>
  );
}
