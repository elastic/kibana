/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

// import { TooltipSelector } from '../../../components/tooltip_selector';
import { MVTField } from '../../fields/mvt_field';
import { OnSourceChangeArgs } from '../../../connected_components/layer_panel/view';
import { TileJsonSourceSettings } from './tilejson_source_settings';
import { TileJsonSource } from './tilejson_source';
import { TooltipSelector } from '../../../components/tooltip_selector';

export interface Props {
  tooltipFields: MVTField[];
  onChange: (...args: OnSourceChangeArgs[]) => void;
  source: TileJsonSource;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface State {}

export class TileJsonUpdateSourceEditor extends Component<Props, State> {
  _onTooltipPropertiesSelect = (propertyNames: string[]) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _handleChange = (settings: Partial<TileJsonSourceSettings>) => {
    const changes: OnSourceChangeArgs[] = [];
    if (settings.layerName !== this.props.source.getLayerName()) {
      changes.push({ propName: 'layerName', value: settings.layerName });
    }
    if (settings.minSourceZoom !== this.props.source.getMinZoom()) {
      changes.push({ propName: 'minSourceZoom', value: settings.minSourceZoom });
    }
    if (settings.maxSourceZoom !== this.props.source.getMaxZoom()) {
      changes.push({ propName: 'maxSourceZoom', value: settings.maxSourceZoom });
    }
    this.props.onChange(...changes);
  };

  _renderSourceSettingsCard() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.maps.tileJson.sourceSettings"
                defaultMessage="Source settings"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="m" />
          <TileJsonSourceSettings
            handleChange={this._handleChange}
            layerName={this.props.source.getLayerName() || ''}
            url={this.props.source.getUrl()}
          />
        </EuiPanel>

        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  // _renderTooltipSelectionCard() {
  //   return (
  //     <Fragment>
  //       <EuiPanel>
  //         <EuiTitle size="xs">
  //           <h5>
  //             <FormattedMessage
  //               id="xpack.maps.mvtSource.tooltipsTitle"
  //               defaultMessage="Tooltip fields"
  //             />
  //           </h5>
  //         </EuiTitle>
  //
  //         <EuiSpacer size="m" />
  //
  //         <TooltipSelector
  //           tooltipFields={this.props.tooltipFields} // selected fields in the tooltip
  //           onChange={this._onTooltipPropertiesSelect}
  //           fields={this.props.source.getMVTFields()} // all the fields in the source
  //         />
  //       </EuiPanel>
  //
  //       <EuiSpacer size="s" />
  //     </Fragment>
  //   );
  // }

  render() {
    return (
      <Fragment>
        {this._renderSourceSettingsCard()}
        {/* {this._renderTooltipSelectionCard()}*/}
      </Fragment>
    );
  }
}
