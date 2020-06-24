/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FlyoutBody } from './flyout_body';
import { LayerDescriptor } from '../../../common/descriptor_types';
import { LayerWizard } from '../../classes/layers/layer_wizard_registry';

const ADD_LAYER_STEP_ID = 'ADD_LAYER_STEP_ID';
const ADD_LAYER_STEP_LABEL = i18n.translate('xpack.maps.addLayerPanel.addLayer', {
  defaultMessage: 'Add layer',
});

interface Props {
  addPreviewLayers: (layerDescriptors: LayerDescriptor[]) => void;
  closeFlyout: () => void;
  hasPreviewLayers: boolean;
  isLoadingPreviewLayers: boolean;
  promotePreviewLayers: () => void;
}

interface State {
  currentStepIndex: number;
  layerSteps: Array<{ id: string; label: string }> | null;
  layerWizard: LayerWizard | null;
  isNextStepBtnEnabled: boolean;
  isNextStepBtnLoading: boolean;
}

const INITIAL_STATE = {
  currentStepIndex: 0,
  layerSteps: null,
  layerWizard: null,
  isNextStepBtnEnabled: false,
  isNextStepBtnLoading: false,
};

export class AddLayerPanel extends Component<Props, State> {
  state = {
    ...INITIAL_STATE,
  };

  _previewLayers = (layerDescriptors: LayerDescriptor[]) => {
    this.props.addPreviewLayers(layerDescriptors);
  };

  _clearLayerWizard = () => {
    this.setState({ ...INITIAL_STATE });
    this.props.addPreviewLayers([]);
  };

  _onWizardSelect = (layerWizard: LayerWizard) => {
    this.setState({
      ...INITIAL_STATE,
      layerWizard,
      layerSteps: [
        ...(layerWizard.prerequisiteSteps ? layerWizard.prerequisiteSteps : []),
        {
          id: ADD_LAYER_STEP_ID,
          label: ADD_LAYER_STEP_LABEL,
        },
      ],
    });
  };

  _onNext = () => {
    if (this.state.layerSteps!.length - 1 === this.state.currentStepIndex) {
      // last step
      this.props.promotePreviewLayers();
    } else {
      this.setState((prevState) => {
        return {
          currentStepIndex: prevState.currentStepIndex + 1,
          isNextStepBtnEnabled: false,
          isNextStepBtnLoading: false,
        };
      });
    }
  };

  _getCurrentStep() {
    return this.state.layerSteps ? this.state.layerSteps![this.state.currentStepIndex] : null;
  }

  _enableNextBtn = () => {
    this.setState({ isNextStepBtnEnabled: true });
  };

  _disableNextBtn = () => {
    this.setState({ isNextStepBtnEnabled: false });
  };

  _startStepLoading = () => {
    this.setState({ isNextStepBtnLoading: true });
  };

  _stopStepLoading = () => {
    this.setState({ isNextStepBtnLoading: false });
  };

  _renderNextButton() {
    const currentStep = this._getCurrentStep();
    if (!currentStep) {
      return null;
    }

    let isDisabled = !this.state.isNextStepBtnEnabled;
    let isLoading = this.state.isNextStepBtnLoading;
    if (currentStep.id === ADD_LAYER_STEP_ID) {
      isDisabled = !this.props.hasPreviewLayers;
      isLoading = this.props.isLoadingPreviewLayers;
    } else {
      isDisabled = !this.state.isNextStepBtnEnabled;
      isLoading = this.state.isNextStepBtnLoading;
    }

    return (
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="importFileButton"
          disabled={isDisabled || isLoading}
          isLoading={isLoading}
          iconSide="right"
          iconType={'sortRight'}
          onClick={this._onNext}
          fill
        >
          {currentStep.label}
        </EuiButton>
      </EuiFlexItem>
    );
  }

  render() {
    const currentStep = this._getCurrentStep();
    return (
      <>
        <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
          <EuiTitle size="s">
            <h2>{currentStep ? currentStep.label : ADD_LAYER_STEP_ID}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <FlyoutBody
          layerWizard={this.state.layerWizard}
          onClear={this._clearLayerWizard}
          onWizardSelect={this._onWizardSelect}
          previewLayers={this._previewLayers}
          currentStepId={currentStep ? currentStep.id : null}
          enableNextBtn={this._enableNextBtn}
          disableNextBtn={this._disableNextBtn}
          startStepLoading={this._startStepLoading}
          stopStepLoading={this._stopStepLoading}
          advanceToNextStep={this._onNext}
        />

        <EuiFlyoutFooter className="mapLayerPanel__footer">
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={this.props.closeFlyout}
                flush="left"
                data-test-subj="layerAddCancelButton"
              >
                <FormattedMessage
                  id="xpack.maps.addLayerPanel.footer.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {this._renderNextButton()}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </>
    );
  }
}
