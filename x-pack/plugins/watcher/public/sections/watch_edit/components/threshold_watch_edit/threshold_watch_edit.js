/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { debounce, isEqual } from 'lodash';
import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import 'ui/dirty_prompt';
import template from './threshold_watch_edit.html';
import '../watch_edit_title_panel';
import 'plugins/watcher/components/threshold_watch_expression';
import 'plugins/watcher/components/threshold_preview_chart';
import 'plugins/watcher/components/watch_actions';
import 'plugins/watcher/components/panel_pager';

import 'plugins/watcher/services/fields';
import 'plugins/watcher/services/license';
import 'plugins/watcher/services/timezone';
import 'plugins/watcher/services/watch';
import 'plugins/watcher/services/interval';
import 'plugins/watcher/services/action_defaults';

import dateMath from '@kbn/datemath';
import { toastNotifications } from 'ui/notify';
import { VisualizeOptions } from 'plugins/watcher/models/visualize_options';
import { REFRESH_INTERVALS } from 'plugins/watcher/../common/constants';

const app = uiModules.get('xpack/watcher');

app.directive('thresholdWatchEdit', function ($injector, i18n) {
  const watchService = $injector.get('xpackWatcherWatchService');
  const fieldsService = $injector.get('xpackWatcherFieldsService');
  const timezoneService = $injector.get('xpackWatcherTimezoneService');
  const licenseService = $injector.get('xpackWatcherLicenseService');
  const intervalService = $injector.get('xpackWatcherIntervalService');
  const actionDefaultsService = $injector.get('xpackWatcherActionDefaultsService');
  const kbnUrl = $injector.get('kbnUrl');
  const confirmModal = $injector.get('confirmModal');
  // const dirtyPrompt = $injector.get('dirtyPrompt');
  const $interval = $injector.get('$interval');

  return {
    restrict: 'E',
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
    },
    bindToController: true,
    controllerAs: 'thresholdWatchEdit',
    controller: class ThresholdWatchEditController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.index = undefined;
        this.originalWatch = {
          ...this.watch
        };

        this.omitBreadcrumbPages = [
          'new-watch',
          this.watch.id
        ];
        this.breadcrumb = this.watch.displayName;

        // dirtyPrompt.register(() => !this.watch.isEqualTo(this.originalWatch));
        $scope.$on('$destroy', () => {
          // dirtyPrompt.deregister();
          this.stopRefreshWatchVisualizationTimer();
        });

        this.loadFields();
      }

      loadFields = () => {
        if (!isEqual(this.watch.index, this.index)) {
          this.index = this.watch.index;

          if (!this.index.length) {
            this.fields = [];
            return;
          }

          fieldsService.getFields(this.index)
            .then((fields) => {
              this.fields = fields;
            });
        }
      }

      onChange = (watch) => {
        this.loadFields();
        this.watch = watch;
        this.updateVisualizeTimeWindow();
        this.visualizeWatch();
      }

      onActionChange = () => {}

      onTitlePanelValid = () => {
        this.titlePanelValid = true;
        this.visualizeWatch();
      }

      onTitlePanelInvalid = () => {
        this.titlePanelValid = false;
      }

      onConditionPanelValid = () => {
        this.conditionPanelValid = true;
        this.visualizeWatch();
      }

      onConditionPanelInvalid = () => {
        this.conditionPanelValid = false;
      }

      onActionsValid = () => {
        this.actionsPanelValid = true;
      }

      onActionsInvalid = () => {
        this.actionsPanelValid = false;
      }

      onActionAdd = (actionType) => {
        const defaults = actionDefaultsService.getDefaults(this.watch.type, actionType);
        this.watch.createAction(actionType, defaults);
      }

      onActionDelete = (action) => {
        this.watch.deleteAction(action);
      }

      onActionSimulate = (action) => {
        watchService.simulateWatchAction(this.watch, action)
          .then((watchHistoryItem) => {
            const actionStatuses = watchHistoryItem.watchStatus.actionStatuses;
            const actionStatus = actionStatuses.find(a => a.id === action.id);

            if (actionStatus.lastExecutionSuccessful === false) {
              const message = actionStatus.lastExecutionReason || action.simulateFailMessage;
              toastNotifications.addDanger(message);
            } else {
              toastNotifications.addSuccess(action.simulateMessage);
            }
          })
          .catch(err => {
            toastNotifications.addDanger(err);
          });
      }

      onClose = () => {
        // dirtyPrompt.deregister();
        kbnUrl.change('/management/elasticsearch/watcher/watches', {});
      }

      get saveDisabled() {
        return !(this.titlePanelValid && this.conditionPanelValid && this.actionsPanelValid);
      }

      updateVisualizeTimeWindow = () => {
        const VISUALIZE_TIME_WINDOW_MULTIPLIER = 5;

        const fromExpression = `now-${this.watch.timeWindowSize * VISUALIZE_TIME_WINDOW_MULTIPLIER}${this.watch.timeWindowUnit}`;
        const toExpression = `now`;

        const fromMoment = dateMath.parse(fromExpression);
        const toMoment = dateMath.parse(toExpression);
        this.visualizeTimeWindowFrom = fromMoment ? fromMoment.valueOf() : undefined;
        this.visualizeTimeWindowTo = toMoment ? toMoment.valueOf() : undefined;
      }

      visualizeWatch = debounce(() => {
        if (!this.titlePanelValid || !this.conditionPanelValid) {
          return;
        }

        const interval = intervalService.getInterval({
          min: this.visualizeTimeWindowFrom,
          max: this.visualizeTimeWindowTo
        }).expression;

        const visualizeOptions = new VisualizeOptions({
          rangeFrom: this.visualizeTimeWindowFrom,
          rangeTo: this.visualizeTimeWindowTo,
          interval,
          timezone: timezoneService.getTimezone()
        });

        return watchService.visualizeWatch(this.watch, visualizeOptions)
          .then(({ visualizeData }) => {
            this.visualizeData = visualizeData;
            this.visualizeDataPageCount = Object.keys(visualizeData).length;
            this.setVisualizationPageByKey(this.visualizeDataKey);
            this.restartRefreshWatchVisualizationTimer();
          })
          .catch(e => {
            toastNotifications.addDanger(e);
            this.stopRefreshWatchVisualizationTimer();
          });
      }, 500);

      setVisualizationPageByKey = (key) => {
        const newIndex = Object.keys(this.visualizeData).indexOf(key);
        if (newIndex === -1) {
          this.setVisualizationPage(0);
        } else {
          this.setVisualizationPage(newIndex);
        }
      }

      setVisualizationPage = (index) => {
        this.visualizeDataKey = Object.keys(this.visualizeData)[index];

        this.visualizeDataPageIndex = index;
        this.visualizeDataTitle = `${this.watch.termField} (${index + 1} of ${this.visualizeDataPageCount}): ${this.visualizeDataKey}`;
        this.chartSeries = this.visualizeData[this.visualizeDataKey];
      }

      onVisualizationNextPage = () => {
        const newIndex = this.visualizeDataPageIndex + 1;

        if (newIndex < this.visualizeDataPageCount) {
          this.setVisualizationPage(newIndex);
        } else {
          this.setVisualizationPage(0);
        }
      }

      onVisualizationPreviousPage = () => {
        const newIndex = this.visualizeDataPageIndex - 1;

        if (newIndex >= 0) {
          this.setVisualizationPage(newIndex);
        } else {
          this.setVisualizationPage(this.visualizeDataPageCount - 1);
        }
      }

      restartRefreshWatchVisualizationTimer = () => {
        this.stopRefreshWatchVisualizationTimer();
        this.refreshVisualizationWatchInterval = $interval(this.visualizeWatch, REFRESH_INTERVALS.WATCH_VISUALIZATION);
      }

      stopRefreshWatchVisualizationTimer = () => {
        if (Boolean(this.refreshVisualizationWatchInterval)) {
          $interval.cancel(this.refreshVisualizationWatchInterval);
        }
      }

      onWatchSave = () => {
        if (!this.watch.isNew) {
          return this.saveWatch();
        }

        return this.isExistingWatch()
          .then(existingWatch => {
            if (!existingWatch) {
              return this.saveWatch();
            }

            const confirmModalOptions = {
              onConfirm: this.saveWatch,
              confirmButtonText: i18n('xpack.watcher.sections.watchEdit.threshold.saveConfirmModal.overwriteWatchButtonLabel', {
                defaultMessage: 'Overwrite Watch',
              }),
            };

            const message = i18n('xpack.watcher.sections.watchEdit.threshold.saveConfirmModal.description', {
              defaultMessage: 'Watch with ID "{watchId}" {watchNameMessageFragment} already exists. Do you want to overwrite it?',
              values: {
                watchId: this.watch.id,
                watchNameMessageFragment: existingWatch.name
                  ? i18n('xpack.watcher.sections.watchEdit.threshold.saveConfirmModal.descriptionFragmentText', {
                    defaultMessage: '(name: "{existingWatchName}")',
                    values: {
                      existingWatchName: existingWatch.name
                    }
                  })
                  : ''
              }
            });
            return confirmModal(message, confirmModalOptions);
          })
          .catch(err => toastNotifications.addDanger(err));
      }

      isExistingWatch = () => {
        return watchService.loadWatch(this.watch.id)
          .then(existingWatch => {
            return existingWatch;
          })
          .catch(err => {
            return licenseService.checkValidity()
              .then(() => {
                if (err.status === 404) {
                  return false;
                }
                throw err;
              });
          });
      }

      saveWatch = () => {
        return watchService.saveWatch(this.watch)
          .then(() => {
            this.watch.isNew = false; // without this, the message displays 'New Watch'
            toastNotifications.addSuccess(
              i18n('xpack.watcher.sections.watchEdit.threshold.saveSuccessNotificationText', {
                defaultMessage: 'Saved \'{watchDisplayName}\'',
                values: {
                  watchDisplayName: this.watch.displayName
                }
              }),
            );
            this.onClose();
          })
          .catch(err => {
            return licenseService.checkValidity()
              .then(() => toastNotifications.addDanger(err));
          });
      }
    }
  };
});
