/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import template from './job_group_select.html';

import { mlJobService } from 'plugins/ml/services/job_service';
import { mlCalendarService } from 'plugins/ml/services/calendar_service';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlJobGroupSelect', function (i18n) {
  return {
    restrict: 'E',
    template,
    scope: {
      jobGroups: '=',
      disabled: '=',
      externalUpdateFunction: '='
    },
    controllerAs: 'mlGroupSelect',
    bindToController: true,
    controller: class MlGroupSelectController extends InitAfterBindingsWorkaround {

      initAfterBindings($scope) {
        this.$scope = $scope;
        this.selectedGroups = [];
        this.groups = [];
        this.$scope.newGroupLabel = i18n('xpack.ml.jobGroupSelect.newGroupLabel', { defaultMessage: '(new group)' });

        // load the jobs, in case they've not been loaded before
        // in order to get the job groups
        mlJobService.loadJobs()
          .then(() => {
            // temp id map for fast deduplication
            const tempGroupIds = {};

            const jobGroups = mlJobService.getJobGroups();
            this.groups = jobGroups.map((g) => {
              tempGroupIds[g.id] = null;
              return { id: g.id, count: g.jobs.length, isTag: false };
            });
            // if jobGroups hasn't been passed in or it isn't an array, create a new one
            // needed because advanced job configuration page may not have a jobs array. e.g. when cloning
            if (Array.isArray(this.jobGroups) === false) {
              this.jobGroups = [];
            }

            // load the calendar groups and add any additional groups to the list
            mlCalendarService.loadCalendars(mlJobService.jobs)
            	.then(() => {
                const calendarGroups = mlCalendarService.getCalendarGroups();
                calendarGroups.forEach((g) => {
                  // if the group is not used in any jobs, add it to the list
                  if (tempGroupIds[g.id] === undefined) {
                    this.groups.push({ id: g.id, count: 0, isTag: false });
                  }
                });
                this.populateSelectedGroups(this.jobGroups);
              })
              .catch((error) => {
                console.log('Could not load groups from calendars', error);
                this.populateSelectedGroups(this.jobGroups);
              })
              .then(() => {
                $scope.$applyAsync();
              });
          });

        // make the populateSelectedGroups function callable from elsewhere.
        // this is used in the advanced job configuration page, when the user has edited the
        // job's JSON, we need to force update the displayed selected groups
        if (this.externalUpdateFunction !== undefined) {
          this.externalUpdateFunction.update = (groups) => { this.populateSelectedGroups(groups); };
        }
      }

      // takes a list of groups ids
      // if the ids has already been used, add it to list of selected groups for display
      // if it hasn't, create the group
      populateSelectedGroups(groups) {
        this.selectedGroups = [];
        groups.forEach(gId => {
          const tempGroup = _.filter(this.groups, { id: gId });
          if (tempGroup.length) {
            this.selectedGroups.push(tempGroup[0]);
          } else {
            this.selectedGroups.push(this.createNewItem(gId));
          }
        });
      }

      onGroupsChanged() {
        // wipe the groups and add all of the selected ids
        this.jobGroups.length = 0;
        this.selectedGroups.forEach((group) => {
          this.jobGroups.push(group.id);
        });
      }

      createNewItem(groupId) {
        const gId = groupId.toLowerCase();
        return ({ id: gId, count: 0, isTag: true });
      }

      groupTypes(group) {
        if(group.isTag === false) {
          return i18n('xpack.ml.jobGroupSelect.existingGroupsLabel', { defaultMessage: 'Existing groups' });
        }
      }
    }
  };
});
