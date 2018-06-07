/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import { Notifier, toastNotifications } from 'ui/notify';
import template from './pipeline_edit.html';
import 'plugins/logstash/services/license';
import 'plugins/logstash/services/security';
import './pipeline_edit.less';
import '../../../../components/tooltip';
import { TOOLTIPS } from '../../../../../common/constants';
import 'ace';

const app = uiModules.get('xpack/logstash');

app.directive('pipelineEdit', function ($injector) {
  const pipelineService = $injector.get('pipelineService');
  const licenseService = $injector.get('logstashLicenseService');
  const securityService = $injector.get('logstashSecurityService');
  const kbnUrl = $injector.get('kbnUrl');
  const confirmModal = $injector.get('confirmModal');

  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '='
    },
    bindToController: true,
    controllerAs: 'pipelineEdit',
    controller: class PipelineEditController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.originalPipeline = { ...this.pipeline };
        this.notifier = new Notifier({ location: 'Logstash' });
        this.isNewPipeline = isEmpty(this.pipeline.id);
        // only if security is enabled and available, we tack on the username.
        if (securityService.isSecurityEnabled) {
          $scope.user = $injector.get('ShieldUser').getCurrent();
        } else {
          $scope.user = null;
        }
        $scope.aceLoaded = (editor) => {
          this.editor = editor;
          editor.setReadOnly(this.isReadOnly);
          editor.getSession().setMode("ace/mode/ruby");
          editor.setOptions({
            minLines: 25,
            maxLines: Infinity
          });
          editor.$blockScrolling = Infinity;
        };
        if (this.isReadOnly) {
          toastNotifications.addWarning(licenseService.message);
        }

        this.tooltips = TOOLTIPS;

      }

      onPipelineSave = (username) => {
        this.pipeline.username = username;
        return pipelineService.savePipeline(this.pipeline)
          .then(() => {
            toastNotifications.addSuccess(`Saved '${this.pipeline.id}'`);
            this.close();
          })
          .catch(err => {
            return licenseService.checkValidity()
              .then(() => this.notifier.error(err));
          });
      }

      onPipelineDelete = (pipelineId) => {
        const confirmModalOptions = {
          onConfirm: this.deletePipeline,
          confirmButtonText: `Delete pipeline ${pipelineId}`
        };

        return confirmModal('You cannot recover a deleted pipeline.', confirmModalOptions);
      }

      onClose = () => {
        this.close();
      }

      deletePipeline = () => {
        return pipelineService.deletePipeline(this.pipeline.id)
          .then(() => {
            toastNotifications.addSuccess(`Deleted '${this.pipeline.id}'`);
            this.close();
          })
          .catch(err => {
            return licenseService.checkValidity()
              .then(() => this.notifier.error(err));
          });
      }

      close = () => {
        kbnUrl.change('/management/logstash/pipelines', {});
      }

      get isSaveEnabled() {
        return !(this.form.$invalid || this.jsonForm.$invalid);
      }

      get isReadOnly() {
        return licenseService.isReadOnly;
      }
    }
  };
});
