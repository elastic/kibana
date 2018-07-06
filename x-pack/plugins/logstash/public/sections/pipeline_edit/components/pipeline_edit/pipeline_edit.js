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
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiPage,
  EuiPageContent,
  EuiSelect,
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

export class PipelineEditor extends React.Component {
  constructor(props) {
    super(props);

    const {
      id,
      description,
      pipeline,
      settings,
    } = this.props.pipeline;

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
        }
      },
      pipelineIdErrors: [],
      showPipelineIdError: false,
    };
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

  onClose = async () => {
    await this.props.close();
  }

  onPipelineSave = async () => {
    const { pipelineService } = this.props;
    console.log(this.state.pipeline);
    const res = await pipelineService.savePipeline(this.state.pipeline)
      .then(stuff => console.log(stuff))
      .catch(err => console.log(err));
    console.log(res);
  }

  onPipelineDescriptionChange = ({ target: { value } }) => {
    this.setState({
      pipeline: {
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
              <EuiButton fill onClick={this.onPipelineSave}>
                Create and deploy
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={this.onClose}>
                Cancel
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiForm
            isInvalid={this.state.showPipelineIdError}
            error={this.state.pipelineIdErrors}
          >
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
                  maxLines: Infinity
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
                  value={this.state.queueType}
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
      </EuiPage>
    );
  }
}

// import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';
// import { InitAfterBindingsWorkaround } from 'ui/compat';
// import { Notifier, toastNotifications } from 'ui/notify';
// import template from './pipeline_edit.html';
import 'plugins/logstash/services/license';
import 'plugins/logstash/services/security';
import './pipeline_edit.less';
import '../../../../components/tooltip';
// import { EDITOR } from '../../../../../common/constants';
import 'ace';
// import { width } from 'window-size';

const app = uiModules.get('xpack/logstash');

app.directive('pipelineEdit', function ($injector) {
  const pipelineService = $injector.get('pipelineService');
  // const licenseService = $injector.get('logstashLicenseService');
  const securityService = $injector.get('logstashSecurityService');
  const kbnUrl = $injector.get('kbnUrl');
  const shieldUser = $injector.get('ShieldUser');
  // const confirmModal = $injector.get('confirmModal');

  return {
    restrict: 'E',
    link: async (scope, el) => {
      const close = () => scope.$evalAsync(kbnUrl.change('/management/logstash/pipelines', {}));

      const userResource = securityService.isSecurityEnabled
        ? await shieldUser.getCurrent().$promise
        : null;

      render(
        <PipelineEditor
          kbnUrl={kbnUrl}
          close={close}
          username={userResource.username}
          pipeline={scope.pipeline}
          pipelineService={pipelineService}
        />, el[0]);
    },
    // template: template,
    scope: {
      pipeline: '=',
    },
    // bindToController: true,
    // controllerAs: 'pipelineEdit',
    // controller: class PipelineEditController extends InitAfterBindingsWorkaround {
    //   initAfterBindings($scope) {
    //     this.originalPipeline = { ...this.pipeline };
    //     this.notifier = new Notifier({ location: 'Logstash' });
    //     this.isNewPipeline = isEmpty(this.pipeline.id);
    //     // only if security is enabled and available, we tack on the username.
    //     if (securityService.isSecurityEnabled) {
    //       $scope.user = $injector.get('ShieldUser').getCurrent();
    //     } else {
    //       $scope.user = null;
    //     }
    //     $scope.aceLoaded = editor => {
    //       this.editor = editor;
    //       /*
    //        * This sets the space between the editor's borders and the
    //        * edges of the top/bottom lines to make for a less-crowded
    //        * typing experience.
    //        */
    //       editor.renderer.setScrollMargin(
    //         EDITOR.PIPELINE_EDITOR_SCROLL_MARGIN_TOP_PX,
    //         EDITOR.PIPELINE_EDITOR_SCROLL_MARGIN_BOTTOM_PX,
    //         0,
    //         0
    //       );
    //       editor.setReadOnly(this.isReadOnly);
    //       editor.setOptions({
    //         minLines: 25,
    //         maxLines: Infinity,
    //       });
    //       editor.$blockScrolling = Infinity;
    //     };
    //     if (this.isReadOnly) {
    //       toastNotifications.addWarning(licenseService.message);
    //     }

    //     this.tooltips = TOOLTIPS;
    //   }

    //   onPipelineSave = username => {
    //     this.pipeline.username = username;
    //     return pipelineService
    //       .savePipeline(this.pipeline)
    //       .then(() => {
    //         toastNotifications.addSuccess(`Saved '${this.pipeline.id}'`);
    //         this.close();
    //       })
    //       .catch(err => {
    //         return licenseService
    //           .checkValidity()
    //           .then(() => this.notifier.error(err));
    //       });
    //   };

    //   onPipelineDelete = pipelineId => {
    //     const confirmModalOptions = {
    //       onConfirm: this.deletePipeline,
    //       confirmButtonText: `Delete pipeline ${pipelineId}`,
    //     };

    //     return confirmModal(
    //       'You cannot recover a deleted pipeline.',
    //       confirmModalOptions
    //     );
    //   };

    //   onClose = () => {
    //     this.close();
    //   };

    //   deletePipeline = () => {
    //     return pipelineService
    //       .deletePipeline(this.pipeline.id)
    //       .then(() => {
    //         toastNotifications.addSuccess(`Deleted '${this.pipeline.id}'`);
    //         this.close();
    //       })
    //       .catch(err => {
    //         return licenseService
    //           .checkValidity()
    //           .then(() => this.notifier.error(err));
    //       });
    //   };

    //   close = () => {
    //     kbnUrl.change('/management/logstash/pipelines', {});
    //   };

    //   get isSaveEnabled() {
    //     return !(this.form.$invalid || this.jsonForm.$invalid);
    //   }

    //   get isReadOnly() {
    //     return licenseService.isReadOnly;
    //   }
    // },
  };
});
