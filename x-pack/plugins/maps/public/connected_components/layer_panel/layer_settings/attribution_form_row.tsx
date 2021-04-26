/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGrid, EuiFlexItem, EuiFormRow, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Attribution } from '../../../../common/descriptor_types';
import { ILayer } from '../../../classes/layers/layer';
import { AttributionPopover } from './attribution_popover';

interface Props {
  layer: ILayer;
  onChange: (attribution?: Attribution) => void;
}

export function AttributionFormRow(props: Props) {
  function renderAttribution() {
    const layerDescriptor = props.layer.getDescriptor();
    return layerDescriptor.attribution === undefined ? (
      <AttributionPopover
        onChange={props.onChange}
        popoverButtonIcon="plusInCircleFilled"
        popoverButtonLabel={i18n.translate('xpack.maps.attribution.addBtnLabel', {
          defaultMessage: 'Add',
        })}
        label={''}
        url={''}
      />
    ) : (
      <div>
        <EuiLink color="text" href={layerDescriptor.attribution.url} target="_blank">
          {layerDescriptor.attribution.label}
        </EuiLink>
        <EuiFlexGrid>
          <EuiFlexItem grow={false}>
            <AttributionPopover
              onChange={props.onChange}
              popoverButtonIcon="pencil"
              popoverButtonLabel={i18n.translate('xpack.maps.attribution.editBtnLabel', {
                defaultMessage: 'Edit',
              })}
              label={layerDescriptor.attribution.label}
              url={layerDescriptor.attribution.url}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={() => {
                props.onChange();
              }}
              size="xs"
              iconType="trash"
            >
              <FormattedMessage id="xpack.maps.attribution.clearBtnLabel" defaultMessage="Clear" />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGrid>
      </div>
    );
  }

  return props.layer.getSource().getAttributionProvider() ? null : (
    <EuiFormRow
      label={i18n.translate('xpack.maps.layerSettings.attributionLabel', {
        defaultMessage: 'Attribution',
      })}
      display="columnCompressed"
    >
      {renderAttribution()}
    </EuiFormRow>
  );
}
