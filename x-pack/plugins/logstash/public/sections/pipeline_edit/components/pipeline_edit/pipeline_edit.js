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
} from '@elastic/eui';


export class PipelineEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pipeline: { }
    };
  }

  getFormLabelWithTooltipIcon(labelText, tooltipText) {
    return (
      <div>
        <span>{labelText}</span>
        <EuiIconTip content={tooltipText} type="questionInCircle" />
      </div>
    );
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
              <EuiButton fill>
                Create and deploy
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton>
                Cancel
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiForm>
            <EuiFormRow
              fullWidth
              label="Pipeline ID"
            >
              <EuiFieldText fullWidth name="pipelineId" />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label="Description"
            >
              <EuiFieldText fullWidth name="pipelineDescription" />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label="Pipeline"
            >
              <EuiCodeEditor
                width={'1017'}
              />
            </EuiFormRow>
            <EuiFormRow
              label={
                this.getFormLabelWithTooltipIcon(
                  'Pipeline workers',
                  TOOLTIPS.settings['pipeline.workers']
                )}
            >
              <EuiFieldNumber compressed />
            </EuiFormRow>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={
                    this.getFormLabelWithTooltipIcon(
                      'Pipeline batch size',
                      TOOLTIPS.settings['pipeline.batch.size']
                    )}
                >
                  <EuiFieldNumber />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow label={
                  this.getFormLabelWithTooltipIcon(
                    'Pipeline batch delay',
                    TOOLTIPS.settings['pipeline.batch.delay']
                  )}
                >
                  <EuiFieldNumber />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem>
                TODO: Add additional fields here
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPageContent>
      </EuiPage>
    );
  }
  // onPipelineSave(username) {

  // }
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

app.directive('pipelineEdit', function () {
  // const pipelineService = $injector.get('pipelineService');
  // const licenseService = $injector.get('logstashLicenseService');
  // const securityService = $injector.get('logstashSecurityService');
  // const kbnUrl = $injector.get('kbnUrl');
  // const confirmModal = $injector.get('confirmModal');

  return {
    restrict: 'E',
    link: (scope, el) => {
      render(<PipelineEditor />, el[0]);
    },
    // template: template,
    // scope: {
    //   pipeline: '=',
    // },
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
