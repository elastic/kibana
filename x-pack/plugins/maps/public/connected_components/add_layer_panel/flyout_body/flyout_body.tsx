/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LayerWizardSelect } from './layer_wizard_select';
import { LayerWizard, RenderWizardArguments } from '../../../classes/layers';

type Props = RenderWizardArguments & {
  layerWizard: LayerWizard | null;
  onClear: () => void;
  onWizardSelect: (layerWizard: LayerWizard) => void;
  showBackButton: boolean;
};

export const FlyoutBody = (props: Props) => {
  function renderContent() {
    if (!props.layerWizard || !props.currentStepId) {
      return <LayerWizardSelect onSelect={props.onWizardSelect} />;
    }

    const renderWizardArgs = {
      previewLayers: props.previewLayers,
      mapColors: props.mapColors,
      currentStepId: props.currentStepId,
      isOnFinalStep: props.isOnFinalStep,
      enableNextBtn: props.enableNextBtn,
      disableNextBtn: props.disableNextBtn,
      startStepLoading: props.startStepLoading,
      stopStepLoading: props.stopStepLoading,
      advanceToNextStep: props.advanceToNextStep,
    };

    const backButton = props.showBackButton ? (
      <Fragment>
        <EuiButtonEmpty size="xs" flush="left" onClick={props.onClear} iconType="arrowLeft">
          <FormattedMessage
            id="xpack.maps.addLayerPanel.changeDataSourceButtonLabel"
            defaultMessage="Change layer"
          />
        </EuiButtonEmpty>
        <EuiSpacer size="s" />
      </Fragment>
    ) : null;

    return (
      <Fragment>
        {backButton}
        {props.layerWizard.renderWizard(renderWizardArgs)}
      </Fragment>
    );
  }

  return (
    <div className="mapLayerPanel__body" data-test-subj="layerAddForm">
      <div className="mapLayerPanel__bodyOverflow">{renderContent()}</div>
    </div>
  );
};
