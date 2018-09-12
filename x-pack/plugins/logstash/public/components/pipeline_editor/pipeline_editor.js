/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import 'brace/mode/plain_text';
import 'brace/theme/github';

import { isEmpty } from 'lodash';
import { TOOLTIPS } from '../../../common/constants/tooltips';
import {
  EuiButton,
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPage,
  EuiPageContent,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { ConfirmDeletePipelineModal } from './confirm_delete_pipeline_modal';
import { FlexItemSetting } from './flex_item_setting';
import { FormLabelWithIconTip } from './form_label_with_icon_tip';
import { PIPELINE_EDITOR } from '../../../common/constants';

export class PipelineEditor extends React.Component {
  constructor(props) {
    super(props);

    const {
      pipeline: { id, description, pipeline, settings },
      username,
    } = this.props;

    // TODO: clean up this regex pattern
    this.pipelineIdPattern = /[a-zA-Z_][a-zA-Z0-9_\-]*/;

    const pipelineWorkers = settings['pipeline.workers'] ? settings['pipeline.workers'] : 1;

    this.state = {
      pipeline: {
        id,
        description,
        pipeline,
        settings: {
          'pipeline.batch.delay': settings['pipeline.batch.delay'],
          'pipeline.batch.size': settings['pipeline.batch.size'],
          'pipeline.workers': pipelineWorkers,
          // TODO: this setting isn't getting saved
          'queue.checkpoint.writes': settings['queue.checkpoint.writes'],
          'queue.max_bytes': settings['queue.max_bytes.number'] + settings['queue.max_bytes.units'],
          'queue.type': settings['queue.type'],
        },
        username,
      },
      pipelineIdErrors: [],
      showConfirmDeleteModal: false,
      showPipelineIdError: false,
      maxBytesNumber: settings['queue.max_bytes.number'],
      maxBytesUnit: settings['queue.max_bytes.units'],
    };
  }

  componentDidMount = () => {
    const { isReadOnly, licenseMessage, toastNotifications } = this.props;
    if (isReadOnly) {
      toastNotifications.addWarning(licenseMessage);
    }
  };

  hideConfirmDeleteModal = () => {
    this.setState({
      showConfirmDeleteModal: false,
    });
  };

  showConfirmDeleteModal = () => {
    this.setState({
      showConfirmDeleteModal: true,
    });
  };

  onPipelineIdChange = ({ target: { value } }) => {
    const pipelineIdErrors = [];
    if (!value) {
      pipelineIdErrors.push(PIPELINE_EDITOR.ID_REQUIRED_ERR_MSG);
    }
    if (!value.match(this.pipelineIdPattern)) {
      pipelineIdErrors.push(PIPELINE_EDITOR.ID_FORMAT_ERR_MSG);
    }

    this.setState({
      pipelineIdErrors,
      showPipelineIdError: !!pipelineIdErrors.length,
      pipeline: {
        ...this.state.pipeline,
        id: value,
      },
    });
  };

  isSaveDisabled = () => {
    return this.state.showPipelineIdError || isEmpty(this.state.pipeline.id);
  };

  onClose = async () => {
    await this.props.close();
  };

  open = async () => {
    const { id } = this.state.pipeline;
    if (id) {
      await this.props.open(id);
    }
  };

  onPipelineSave = () => {
    const { pipelineService, toastNotifications } = this.props;
    const { id } = this.state.pipeline;
    return pipelineService
      .savePipeline({
        id,
        upstreamJSON: this.state.pipeline,
      })
      .then(() => {
        toastNotifications.addSuccess(`Saved "${id}"`);
        this.onClose();
      })
      .catch(this.notifyOnError);
  };

  onPipelineDescriptionChange = ({ target: { value } }) => {
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        description: value,
      },
    });
  };

  onPipelineChange = e => {
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        pipeline: e,
      },
    });
  };

  handleNumberChange = (settingName, value) => {
    const numberValue = parseInt(value, 10);
    this.handleSettingChange(settingName, isNaN(numberValue) ? value : numberValue);
  };

  handleMaxByteNumberChange = value => {
    this.setState({ maxBytesNumber: parseInt(value, 10) });
    this.handleSettingChange('queue.max_bytes', value + this.state.maxBytesUnit);
  };

  handleMaxByteUnitChange = value => {
    this.setState({ maxBytesUnit: value });
    this.handleSettingChange('queue.max_bytes', this.state.maxBytesNumber + value);
  };

  handleSettingChange = (settingName, value) => {
    const settings = { ...this.state.pipeline.settings };
    settings[settingName] = value;
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        settings,
      },
    });
  };

  notifyOnError = err => {
    const { notifier, licenseService } = this.props;

    return licenseService.checkValidity().then(() => notifier.error(err));
  };

  deletePipeline = () => {
    const {
      pipeline: { id },
      pipelineService,
      toastNotifications,
    } = this.props;

    this.hideConfirmDeleteModal();

    return pipelineService
      .deletePipeline(id)
      .then(() => {
        toastNotifications.addSuccess(`Deleted "${id}"`);
        this.onClose();
      })
      .catch(this.notifyOnError);
  };

  render() {
    return (
      <EuiPage data-test-subj={`pipelineEdit pipelineEdit-${this.state.pipeline.id}`}>
        <EuiPageContent
          style={{
            width: 1100,
          }}
          verticalPosition="center"
          horizontalPosition="center"
        >
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="btnSavePipeline"
                fill
                isDisabled={this.isSaveDisabled()}
                onClick={this.onPipelineSave}
              >
                Create and deploy
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="btnCancel" onClick={this.onClose}>
                Cancel
              </EuiButton>
            </EuiFlexItem>
            {!this.props.isNewPipeline && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  data-test-subj="btnDeletePipeline"
                  onClick={this.showConfirmDeleteModal}
                >
                  Delete pipeline
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiForm isInvalid={this.state.showPipelineIdError} error={this.state.pipelineIdErrors}>
            {this.props.isNewPipeline && (
              <EuiFormRow fullWidth label="Pipeline ID">
                <EuiFieldText
                  fullWidth
                  data-test-subj="inputId"
                  isInvalid={this.state.showPipelineIdError}
                  name="pipelineId"
                  onBlur={this.onPipelineIdChange}
                  onChange={this.onPipelineIdChange}
                  value={this.state.pipeline.id}
                />
              </EuiFormRow>
            )}
            <EuiFormRow fullWidth label="Description">
              <EuiFieldText
                data-test-subj="inputDescription"
                fullWidth
                name="pipelineDescription"
                onChange={this.onPipelineDescriptionChange}
                value={this.state.pipeline.description}
              />
            </EuiFormRow>
            <EuiFormRow fullWidth label="Pipeline">
              <div data-test-subj="acePipeline">
                <EuiCodeEditor
                  mode="plain_text"
                  onChange={this.onPipelineChange}
                  setOptions={{
                    minLines: 25,
                    maxLines: Infinity,
                    readOnly: this.props.isReadOnly,
                  }}
                  theme="github"
                  value={this.state.pipeline.pipeline}
                  width={'1017'}
                />
              </div>
            </EuiFormRow>
            <EuiFormRow
              label={
                <FormLabelWithIconTip
                  formRowLabelText="Pipeline workers"
                  formRowTooltipText={TOOLTIPS.settings['pipeline.workers']}
                />
              }
            >
              <EuiFieldNumber
                data-test-subj="inputWorkers"
                onChange={e => this.handleNumberChange('pipeline.workers', e.target.value)}
                value={this.state.pipeline.settings['pipeline.workers']}
              />
            </EuiFormRow>
            <EuiFlexGroup>
              <FlexItemSetting
                formRowLabelText="Pipeline batch size"
                formRowTooltipText={TOOLTIPS.settings['pipeline.batch.size']}
              >
                <EuiFieldNumber
                  data-test-subj="inputBatchSize"
                  onChange={e => this.handleNumberChange('pipeline.batch.size', e.target.value)}
                  value={this.state.pipeline.settings['pipeline.batch.size']}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText="Pipeline batch delay"
                formRowTooltipText={TOOLTIPS.settings['pipeline.batch.delay']}
              >
                <EuiFieldNumber
                  data-test-subj="inputBatchDelay"
                  onChange={e => this.handleNumberChange('pipeline.batch.delay', e.target.value)}
                  value={this.state.pipeline.settings['pipeline.batch.delay']}
                />
              </FlexItemSetting>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <FlexItemSetting
                formRowLabelText="Queue type"
                formRowTooltipText={TOOLTIPS.settings['queue.type']}
              >
                <EuiSelect
                  data-test-subj="selectQueueType"
                  onChange={e => this.handleSettingChange('queue.type', e.target.value)}
                  options={PIPELINE_EDITOR.QUEUE_TYPES}
                  value={this.state.pipeline.settings['queue.type']}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText="Queue max bytes"
                formRowTooltipText={TOOLTIPS.settings['queue.max_bytes']}
              >
                <EuiFieldNumber
                  data-test-subj="inputQueueMaxBytesNumber"
                  onChange={e => this.handleMaxByteNumberChange(e.target.value)}
                  value={this.state.maxBytesNumber}
                />
              </FlexItemSetting>
              <FlexItemSetting>
                <EuiSelect
                  data-test-subj="selectQueueMaxBytesUnits"
                  onChange={e => this.handleMaxByteUnitChange(e.target.value)}
                  options={PIPELINE_EDITOR.UNITS}
                  value={this.state.maxBytesUnit}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText="Queue checkpoint writes"
                formRowTooltipText={TOOLTIPS.settings['queue.checkpoint.writes']}
              >
                <EuiFieldNumber
                  data-test-subj="inputQueueCheckpointWrites"
                  onChange={e => this.handleNumberChange('queue.checkpoint.writes', e.target.value)}
                  value={this.state.pipeline.settings['queue.checkpoint.writes']}
                />
              </FlexItemSetting>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPageContent>
        {this.state.showConfirmDeleteModal && (
          <ConfirmDeletePipelineModal
            id={this.props.pipeline.id}
            cancelDeleteModal={this.hideConfirmDeleteModal}
            confirmDeletePipeline={this.deletePipeline}
          />
        )}
      </EuiPage>
    );
  }
}
