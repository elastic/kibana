/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { TOOLTIPS } from '../../../../../common/constants/tooltips';
import {
  EuiButton,
  EuiCodeEditor,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EUI_MODAL_CANCEL_BUTTON,
  EuiOverlayMask,
  EuiPage,
  EuiPageContent,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

const createOptions = value => ({ text: value, value });

const PIPELINE_ID_REQUIRED_ERR_MSG = 'Pipeline ID is required';
const PIPELINE_ID_FORMAT_ERR_MSG =
  'Pipeline ID must begin with a letter or underscore and contain only letters, underscores, dashes, and numbers';

function getFormLabelWithTooltipIcon(labelText, tooltipText) {
  if (!labelText && !tooltipText) { return null; }

  return (
    <div>
      <span>{labelText}</span>
      &nbsp;
      <EuiIconTip content={tooltipText} type="questionInCircle" />
    </div>
  );
}

function FlexItemSetting(props) {
  const {
    formRowLabelText,
    formRowTooltipText,
  } = props;

  const label = getFormLabelWithTooltipIcon(formRowLabelText, formRowTooltipText);

  return (
    <EuiFlexItem grow={false}>
      <EuiFormRow
        label={label}
        hasEmptyLabelSpace={!label}
      >
        {props.children}
      </EuiFormRow>
    </EuiFlexItem>
  );
}

function ConfirmDeletePipelineModal({
  id,
  cancelDeleteModal,
  confirmDeletePipeline,
}) {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        cancelButtonText="Cancel"
        confirmButtonText="Delete pipeline"
        defaultFocusedButton={EUI_MODAL_CANCEL_BUTTON}
        onCancel={cancelDeleteModal}
        onConfirm={confirmDeletePipeline}
        title={`Delete pipeline ${id}`}
      >
        <p>You cannot recover a deleted pipeline.</p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
}

export class PipelineEditor extends React.Component {
  constructor(props) {
    super(props);

    const {
      pipeline: {
        id,
        description,
        pipeline,
        settings,
      },
      username,
    } = this.props;

    this.queueTypes = ['memory', 'persisted'].map(createOptions);
    this.units = [
      {
        text: 'bytes',
        value: 'b'
      },
      {
        text: 'kilobytes',
        value: 'kb'
      },
      {
        text: 'megabytes',
        value: 'mb'
      },
      {
        text: 'gigabytes',
        value: 'gb'
      },
      {
        text: 'terabytes',
        value: 'tb'
      },
      {
        text: 'petabytes',
        value: 'pb'
      },
    ];
    // TODO: clean up this regex pattern
    this.pipelineIdPattern = /[a-zA-Z_][a-zA-Z0-9_\-]*/;

    const pipelineWorkers = settings['pipeline.workers']
      ? settings['pipeline.workers']
      : 1;

    this.state = {
      pipeline: {
        id,
        description,
        pipeline,
        settings: {
          'pipeline.batch.delay': settings['pipeline.batch.delay'],
          'pipeline.batch.size': settings['pipeline.batch.size'],
          'pipeline.workers': pipelineWorkers,
          'queue.checkpoint.writes': settings['queue.checkpoint.writes'],
          'queue.max_bytes.number': settings['queue.max_bytes.number'],
          'queue.max_bytes.units': settings['queue.max_bytes.units'],
          'queue.type': settings['queue.type'],
        },
        username
      },
      pipelineIdErrors: [],
      showConfirmDeleteModal: false,
      showPipelineIdError: false,
    };
  }

  componentDidMount = () => {
    const {
      isReadOnly,
      licenseMessage,
      toastNotifications,
    } = this.props;
    if (isReadOnly) {
      toastNotifications.addWarning(licenseMessage);
    }
  }

  hideConfirmDeleteModal = () => {
    this.setState({
      showConfirmDeleteModal: false,
    });
  }

  showConfirmDeleteModal = () => {
    this.setState({
      showConfirmDeleteModal: true,
    });
  }

  onPipelineIdChange = ({ target: { value } }) => {
    const pipelineIdErrors = [];
    if (!value) {
      pipelineIdErrors.push(PIPELINE_ID_REQUIRED_ERR_MSG);
    }
    if (!value.match(this.pipelineIdPattern)) {
      pipelineIdErrors.push(PIPELINE_ID_FORMAT_ERR_MSG);
    }

    this.setState({
      pipelineIdErrors,
      showPipelineIdError: !!pipelineIdErrors.length,
      pipeline: {
        ...this.state.pipeline,
        id: value,
      }
    });
  }

  isSaveDisabled = () => {
    return this.state.showPipelineIdError;
  }

  onClose = async () => {
    await this.props.close();
  }

  open = async () => {
    const { id } = this.state.pipeline;
    if (id) {
      await this.props.open(id);
    }
  }

  onPipelineSave = () => {
    const { pipelineService, toastNotifications } = this.props;
    const { id } = this.state.pipeline;
    return pipelineService.savePipeline({
      id,
      upstreamJSON: this.state.pipeline
    })
      .then(() => {
        toastNotifications.addSuccess(`Saved "${id}"`);
        this.onClose();
      })
      .catch(this.notifyOnError);
  }

  onPipelineDescriptionChange = ({ target: { value } }) => {
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        description: value,
      }
    });
  }

  onPipelineChange = e => {
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        pipeline: e,
      }
    });
  }

  handleNumberChange = (settingName, value) => {
    const numberValue = parseInt(value, 10);
    console.log(`number value: ${numberValue}, value: ${value}`);
    this.handleSettingChange(settingName, isNaN(numberValue) ? value : numberValue);
  }

  handleSettingChange = (settingName, value) => {
    console.log(`setting name: ${settingName}, value: ${value}`);
    const settings = { ...this.state.pipeline.settings };
    settings[settingName] = value;
    this.setState({
      pipeline: {
        ...this.state.pipeline,
        settings,
      }
    });
  }

  renderDeletePipelineButton = () => (
    this.props.isNewPipeline
      ? null
      : (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="danger"
            onClick={this.showConfirmDeleteModal}
          >
            Delete pipeline
          </EuiButton>
        </EuiFlexItem>
      )
  )

  notifyOnError = err => {
    const { notifier, licenseService } = this.props;

    return licenseService
      .checkValidity()
      .then(() => notifier.error(err));
  }

  deletePipeline = () => {
    const {
      pipeline: { id },
      pipelineService,
      toastNotifications,
    } = this.props;

    this.hideConfirmDeleteModal();

    return pipelineService.deletePipeline(id)
      .then(() => {
        toastNotifications.addSuccess(`Deleted "${id}"`);
        this.onClose();
      })
      .catch(this.notifyOnError);
  }

  render() {
    return (
      <EuiPage
        data-test-subj="pipelineEdit pipelineEdit-{{pipelineEdit.pipeline.id}}"
      >
        <EuiPageContent
          style={{
            width: 1100
          }}
          verticalPosition={"center"}
          horizontalPosition={"center"}
        >
          <EuiFlexGroup
            justifyContent="flexEnd"
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={this.isSaveDisabled()}
                onClick={this.onPipelineSave}
              >
                Create and deploy
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={this.onClose}>
                Cancel
              </EuiButton>
            </EuiFlexItem>
            {this.renderDeletePipelineButton()}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiForm
            isInvalid={this.state.showPipelineIdError}
            error={this.state.pipelineIdErrors}
          >
            {
              this.props.isNewPipeline &&
              <EuiFormRow
                fullWidth
                label="Pipeline ID"
              >
                <EuiFieldText
                  fullWidth
                  name="pipelineId"
                  onBlur={this.onPipelineIdChange}
                  onChange={this.onPipelineIdChange}
                  isInvalid={this.state.showPipelineIdError}
                  value={this.state.pipeline.id}
                />
              </EuiFormRow>
            }
            <EuiFormRow
              fullWidth
              label="Description"
            >
              <EuiFieldText
                fullWidth
                name="pipelineDescription"
                onChange={this.onPipelineDescriptionChange}
                value={this.state.pipeline.description}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label="Pipeline"
            >
              <EuiCodeEditor
                onChange={this.onPipelineChange}
                setOptions={{
                  minLines: 25,
                  maxLines: Infinity,
                  readOnly: this.props.isReadOnly,
                }}
                value={this.state.pipeline.pipeline}
                width={'1017'}
              />
            </EuiFormRow>
            <EuiFormRow
              label={
                getFormLabelWithTooltipIcon(
                  'Pipeline workers',
                  TOOLTIPS.settings['pipeline.workers']
                )}
            >
              <EuiFieldNumber
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
                  onChange={e => this.handleNumberChange('pipeline.batch.size', e.target.value)}
                  value={this.state.pipeline.settings['pipeline.batch.size']}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText="Pipeline batch delay"
                formRowTooltipText={TOOLTIPS.settings['pipeline.batch.delay']}
              >
                <EuiFieldNumber
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
                  onChange={e => this.handleSettingChange('queue.type', e.target.value)}
                  options={this.queueTypes}
                  value={this.state.pipeline.settings['queue.type']}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText="Queue max bytes"
                formRowTooltipText={TOOLTIPS.settings['queue.max_bytes']}
              >
                <EuiFieldNumber
                  onChange={e => this.handleNumberChange('queue.max_bytes.number', e.target.value)}
                  value={this.state.pipeline.settings['queue.max_bytes.number']}
                />
              </FlexItemSetting>
              <FlexItemSetting>
                <EuiSelect
                  onChange={e => this.handleSettingChange('queue.max_bytes.units', e.target.value)}
                  options={this.units}
                  value={this.state.pipeline.settings['queue.max_bytes.units']}
                />
              </FlexItemSetting>
              <FlexItemSetting
                formRowLabelText="Queue checkpoint writes"
                formRowTooltipText={TOOLTIPS.settings['queue.checkpoint.writes']}
              >
                <EuiFieldNumber
                  onChange={e => this.handleNumberChange('queue.checkpoint.writes', e.target.value)}
                  value={this.state.pipeline.settings['queue.checkpoint.writes']}
                />
              </FlexItemSetting>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPageContent>
        {
          this.state.showConfirmDeleteModal &&
          <ConfirmDeletePipelineModal
            id={this.props.pipeline.id}
            cancelDeleteModal={this.hideConfirmDeleteModal}
            confirmDeletePipeline={this.deletePipeline}
          />
        }
      </EuiPage>
    );
  }
}

import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';
import { Notifier, toastNotifications } from 'ui/notify';
import 'plugins/logstash/services/license';
import 'plugins/logstash/services/security';
import './pipeline_edit.less';
import '../../../../components/tooltip';
import 'ace';

const app = uiModules.get('xpack/logstash');

app.directive('pipelineEdit', function ($injector) {
  const pipelineService = $injector.get('pipelineService');
  const licenseService = $injector.get('logstashLicenseService');
  const securityService = $injector.get('logstashSecurityService');
  const kbnUrl = $injector.get('kbnUrl');
  const shieldUser = $injector.get('ShieldUser');

  return {
    restrict: 'E',
    link: async (scope, el) => {
      const close = () => scope.$evalAsync(kbnUrl.change('/management/logstash/pipelines', {}));
      const open = id => scope.$evalAsync(kbnUrl.change(`/management/logstash/pipelines/${id}/edit`));

      const userResource = securityService.isSecurityEnabled
        ? await shieldUser.getCurrent().$promise
        : null;

      render(
        <PipelineEditor
          kbnUrl={kbnUrl}
          close={close}
          open={open}
          isNewPipeline={isEmpty(scope.pipeline.id)}
          username={
            userResource
              ? userResource.username
              : null
          }
          pipeline={scope.pipeline}
          pipelineService={pipelineService}
          toastNotifications={toastNotifications}
          isReadOnly={licenseService.isReadOnly}
          licenseMessage={licenseService.message}
          licenseService={licenseService}
          notifier={new Notifier({ location: 'Logstash' })}
        />, el[0]);
    },
    scope: {
      pipeline: '=',
    },
  };
});
