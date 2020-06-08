/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { LayerWizardSelect } from './layer_wizard_select';
import { LayerWizard, RenderWizardArguments } from '../../../classes/layers/layer_wizard_registry';
/* eslint-disable @typescript-eslint/consistent-type-definitions */

type Props = RenderWizardArguments & {
  layerWizard: LayerWizard | null;
  onClear: () => void;
  onWizardSelect: (layerWizard: LayerWizard) => void;
};

export const FlyoutBody = (props: Props) => {
  function renderContent() {
    if (!props.layerWizard) {
      return <LayerWizardSelect onSelect={props.onWizardSelect} />;
    }

    const renderWizardArgs = {
      previewLayers: props.previewLayers,
      mapColors: props.mapColors,
      isIndexingTriggered: props.isIndexingTriggered,
      onRemove: props.onRemove,
      onIndexReady: props.onIndexReady,
      importSuccessHandler: props.importSuccessHandler,
      importErrorHandler: props.importErrorHandler,
    };

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

    return (
      <Fragment>
        {backButton}
        <EuiPanel>{props.layerWizard.renderWizard(renderWizardArgs)}</EuiPanel>
      </Fragment>
    );
  }

  return (
    <div className="mapLayerPanel__body" data-test-subj="layerAddForm">
      <div className="mapLayerPanel__bodyOverflow">{renderContent()}</div>
    </div>
  );
};
