/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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

    return (
      <fieldset aria-labelledby="mapsLayerSettingsAttributionLegend">
        <div className="mapAttributionFormRow">
          <legend id="mapsLayerSettingsAttributionLegend" className="mapAttributionFormRow__legend">
            {i18n.translate('xpack.maps.layerSettings.attributionLegend', {
              defaultMessage: 'Attribution',
            })}
          </legend>

          {layerDescriptor.attribution === undefined ? (
            <div className="mapAttributionFormRow__field">
              <AttributionPopover
                onChange={props.onChange}
                popoverButtonIcon="plusInCircleFilled"
                popoverButtonLabel={i18n.translate('xpack.maps.attribution.addBtnLabel', {
                  defaultMessage: 'Add attribution',
                })}
                popoverButtonAriaLabel={i18n.translate('xpack.maps.attribution.addBtnAriaLabel', {
                  defaultMessage: 'Add attribution',
                })}
                popoverButtonClassName="mapAttributionFormRow__addButton"
                label={''}
                url={''}
              />
            </div>
          ) : (
            <div className="mapAttributionFormRow__field">
              <EuiPanel color="subdued" paddingSize="s">
                <EuiLink color="text" href={layerDescriptor.attribution.url} target="_blank">
                  {layerDescriptor.attribution.label}
                </EuiLink>
              </EuiPanel>

              <div className="mapAttributionFormRow__buttons">
                <AttributionPopover
                  onChange={props.onChange}
                  popoverButtonIcon="pencil"
                  popoverButtonAriaLabel={i18n.translate(
                    'xpack.maps.attribution.editBtnAriaLabel',
                    {
                      defaultMessage: 'Edit attribution',
                    }
                  )}
                  popoverButtonLabel={i18n.translate('xpack.maps.attribution.editBtnLabel', {
                    defaultMessage: 'Edit',
                  })}
                  label={layerDescriptor.attribution.label}
                  url={layerDescriptor.attribution.url}
                />

                <EuiButtonEmpty
                  onClick={() => {
                    props.onChange();
                  }}
                  size="xs"
                  iconType="trash"
                  color="danger"
                  aria-label={i18n.translate('xpack.maps.attribution.clearBtnAriaLabel', {
                    defaultMessage: 'Clear attribution',
                  })}
                >
                  <FormattedMessage
                    id="xpack.maps.attribution.clearBtnLabel"
                    defaultMessage="Clear"
                  />
                </EuiButtonEmpty>
              </div>
            </div>
          )}
        </div>
      </fieldset>
    );
  }

  return props.layer.getSource().getAttributionProvider() ? null : renderAttribution();
}
