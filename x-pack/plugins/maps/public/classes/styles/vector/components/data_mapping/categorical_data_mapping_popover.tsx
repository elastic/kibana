/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiIcon, EuiSwitch, EuiSwitchEvent, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataMappingPopover } from './data_mapping_popover';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';

interface Props<DynamicOptions> {
  fieldMetaOptions: FieldMetaOptions;
  onChange: (updatedOptions: DynamicOptions) => void;
  switchDisabled: boolean;
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
            compressed
            disabled={props.switchDisabled}
          />{' '}
          <EuiToolTip
            content={
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.maps.styles.categoricalDataMapping.isEnabled.local"
                    defaultMessage="When disabled, categories are calculated from local data. Categories are re-calculated when layer data changes. Symbols might be inconsistent as users pan, zoom, and filter the map."
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.maps.styles.categoricalDataMapping.isEnabled.server"
                    defaultMessage="When enabled, categories are calculated for the entire data set. Symbols are consistent as users pan, zoom, and filter the map."
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
