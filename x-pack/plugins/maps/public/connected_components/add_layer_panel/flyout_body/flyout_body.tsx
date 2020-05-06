/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { LayerWizardSelect } from './layer_wizard_select';
import { ImportEditor } from './import_editor';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { LayerWizard } from '../../../layers/layer_wizard_registry';

interface Props {
  importView: boolean;
  isIndexingTriggered: boolean;
  layerWizard: LayerWizard;
  mapColors: string[];
  onClear: () => void;
  onRemove: () => void;
  onWizardSelect: (layerWizard: LayerWizard) => void;
  previewLayer: (layerDescriptor: LayerDescriptor, isIndexingSource: boolean) => void;
}

export const FlyoutBody = (props: Props) => {
  function renderContent() {
    if (!props.layerWizard) {
      return <LayerWizardSelect onSelect={props.onWizardSelect} />;
    }

    const backButton = props.isIndexingTriggered ? null : (
      <Fragment>
        <EuiButtonEmpty size="xs" flush="left" onClick={props.onClear} iconType="arrowLeft">
          <FormattedMessage
            id="xpack.maps.addLayerPanel.changeDataSourceButtonLabel"
            defaultMessage="Change layer"
          />
        </EuiButtonEmpty>
        <EuiSpacer size="s" />
      </Fragment>
    );

    if (props.importView) {
      return (
        <Fragment>
          {backButton}
          <ImportEditor
            previewLayer={props.previewLayer}
            mapColors={props.mapColors}
            onRemove={props.onRemove}
          />
        </Fragment>
      );
    }

    return (
      <Fragment>
        {backButton}
        <EuiPanel>
          {props.layerWizard.renderWizard({
            previewLayer: props.previewLayer,
            mapColors: props.mapColors,
          })}
        </EuiPanel>
      </Fragment>
    );
  }

  return (
    <div className="mapLayerPanel__body" data-test-subj="layerAddForm">
      <div className="mapLayerPanel__bodyOverflow">{renderContent()}</div>
    </div>
  );
};
