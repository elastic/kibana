/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { i18n } from '@kbn/i18n';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import { toastNotifications } from 'ui/notify';
import template from './json_watch_edit.html';
import 'plugins/watcher/components/kbn_tabs';
import 'plugins/watcher/components/watch_history_item_detail';
import '../watch_edit_detail';
import '../watch_edit_title_bar';
import '../watch_edit_execute_info_panel';
import '../watch_edit_execute_detail';
import '../watch_edit_actions_execute_summary';
import '../watch_edit_watch_execute_summary';
import 'plugins/watcher/services/license';
import { ACTION_TYPES } from '../../../../../common/constants';

const app = uiModules.get('xpack/watcher');

app.directive('jsonWatchEdit', function ($injector) {
  const watchService = $injector.get('xpackWatcherWatchService');
  const licenseService = $injector.get('xpackWatcherLicenseService');
  const kbnUrl = $injector.get('kbnUrl');
  const confirmModal = $injector.get('confirmModal');
  // const dirtyPrompt = $injector.get('dirtyPrompt');

  return {
    restrict: 'E',
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
    },
    bindToController: true,
    controllerAs: 'jsonWatchEdit',
    controller: class JsonWatchEditController extends InitAfterBindingsWorkaround {
      initAfterBindings() {
        this.selectedTabId = 'edit-watch';
        this.simulateResults = null;
        this.originalWatch = {
          ...this.watch
        };

        this.omitBreadcrumbPages = [
          'new-watch',
          this.watch.id
        ];
        this.breadcrumb = this.watch.displayName;

        // dirtyPrompt.register(() => !this.watch.isEqualTo(this.originalWatch));
        // $scope.$on('$destroy', dirtyPrompt.deregister);

        this.onExecuteDetailsValid();
      }

      onTabSelect = (tabId) => {
        this.selectedTabId = tabId;
      }

      isTabSelected = (tabId) => {
        return this.selectedTabId === tabId;
      }

      onWatchChange = (watch) => {
        this.watch = watch;
      }

      onValid = () => {
        this.isValid = true;
      }

      onInvalid = () => {
        this.isValid = false;
      }

      executeDetailsChange = (executeDetails) => {
        this.executeDetails = executeDetails;
      }

      onExecuteDetailsValid = () => {
        this.isExecuteValid = true;
      }

      onExecuteDetailsInvalid = () => {
        this.isExecuteValid = false;
      }

      onWatchExecute = () => {
        return watchService.executeWatch(this.executeDetails, this.watch)
          .then((watchHistoryItem) => {
            this.simulateResults = watchHistoryItem;
            this.onTabSelect('simulate-results');
          })
          .catch(e => {
            toastNotifications.addDanger(e);
          });
      }

      onWatchSave = () => {
        this.createActionsForWatch(this.watch);

        if (!this.watch.isNew) {
          return this.validateAndSaveWatch();
        }

        return this.isExistingWatch()
          .then(existingWatch => {
            if (!existingWatch) {
              return this.validateAndSaveWatch();
            }

            const confirmModalOptions = {
              onConfirm: this.saveWatch,
              confirmButtonText: i18n.translate('xpack.watcher.sections.watchEdit.json.saveConfirmModal.overwriteWatchButtonLabel', {
                defaultMessage: 'Overwrite Watch',
              }),
            };

            const message = i18n.translate('xpack.watcher.sections.watchEdit.json.saveConfirmModal.description', {
              defaultMessage: 'Watch with ID "{watchId}" {watchNameMessageFragment} already exists. Do you want to overwrite it?',
              values: {
                watchId: this.watch.id,
                watchNameMessageFragment: existingWatch.name
                  ? i18n.translate('xpack.watcher.sections.watchEdit.json.saveConfirmModal.descriptionFragmentText', {
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

      validateAndSaveWatch = () => {
        const { warning } = this.watch.validate();

        if (warning) {
          const confirmModalOptions = {
            onConfirm: this.saveWatch,
            confirmButtonText: i18n.translate('xpack.watcher.sections.watchEdit.json.watchErrorsWarning.confirmSaveWatch', {
              defaultMessage: 'Save watch',
            }),
          };

          return confirmModal(warning.message, confirmModalOptions);
        }

        return this.saveWatch();
      }

      saveWatch = () => {
        return watchService.saveWatch(this.watch)
          .then(() => {
            this.watch.isNew = false; // without this, the message displays 'New Watch'
            toastNotifications.addSuccess(
              i18n.translate('xpack.watcher.sections.watchEdit.json.saveSuccessNotificationText', {
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

      onWatchDelete = () => {
        const confirmModalOptions = {
          onConfirm: this.deleteWatch,
          confirmButtonText: i18n.translate('xpack.watcher.sections.watchEdit.json.deleteConfirmModal.overwriteWatchButtonLabel', {
            defaultMessage: 'Delete Watch',
          }),
        };

        return confirmModal(
          i18n.translate('xpack.watcher.sections.watchEdit.json.deleteConfirmModal.description', {
            defaultMessage: 'This will permanently delete the watch. Are you sure?',
          }),
          confirmModalOptions
        );
      }

      deleteWatch = () => {
        return watchService.deleteWatch(this.watch.id)
          .then(() => {
            toastNotifications.addSuccess(
              i18n.translate('xpack.watcher.sections.watchEdit.json.deleteSuccessNotificationText', {
                defaultMessage: 'Deleted \'{watchDisplayName}\'',
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

      onClose = () => {
        // dirtyPrompt.deregister();
        kbnUrl.change('/management/elasticsearch/watcher/watches', {});
      }

      /**
       * Actions instances are not automatically added to the Watch _actions_ Array
       * when we add them in the Json editor. This method takes takes care of it.
       *
       * @param watchModel Watch instance
       * @return Watch instance
       */
      createActionsForWatch(watchInstance) {
        watchInstance.resetActions();

        let action;
        let type;
        let actionProps;

        Object.keys(watchInstance.watch.actions).forEach((k) => {
          action = watchInstance.watch.actions[k];
          type = this.getTypeFromAction(action);
          actionProps = this.getPropsFromAction(type, action);

          watchInstance.createAction(type, actionProps);
        });

        return watchInstance;
      }

      /**
       * Get the type from an action where a key defines its type.
       * eg: { email: { ... } } | { slack: { ... } }
       *
       * @param action A raw action object
       * @return {string} The action type
       */
      getTypeFromAction(action) {
        const actionKeys = Object.keys(action);
        let type;

        Object.keys(ACTION_TYPES).forEach((k) => {
          if (actionKeys.includes(ACTION_TYPES[k])) {
            type = ACTION_TYPES[k];
          }
        });

        return type ? type : ACTION_TYPES.UNKNOWN;
      }

      getPropsFromAction(type, action) {
        if (type === ACTION_TYPES.SLACK) {
          // Slack action has its props inside the "message" object
          return action[type].message;
        }
        return action[type];
      }
    }
  };
});
