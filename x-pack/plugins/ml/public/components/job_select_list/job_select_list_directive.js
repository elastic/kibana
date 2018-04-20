/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * ml-job-select-list directive for rendering a multi-select control for selecting
 * one or more jobs from the list of configured jobs.
 */

import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import d3 from 'd3';

import template from './job_select_list.html';
import { isTimeSeriesViewJob } from 'plugins/ml/../common/util/job_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlJobSelectList', function (mlJobService, mlJobSelectService, timefilter) {
  return {
    restrict: 'AE',
    replace: true,
    transclude: true,
    template,
    controller: function ($scope) {
      $scope.jobs = [];
      $scope.groups = [];
      $scope.homelessJobs = [];
      $scope.singleSelection = false;
      $scope.timeSeriesOnly = false;
      $scope.noJobsCreated = undefined;
      $scope.applyTimeRange = mlJobSelectService.jobSelectListState.applyTimeRange;
      $scope.urlSelectedIds = {};
      $scope.selected = {};
      $scope.allGroupsSelected = false;
      $scope.allJobsSelected = false;
      $scope.selectedJobRadio = '';
      $scope.selectedCount = 0;

      mlJobService.loadJobs()
        .then((resp) => {
          if (resp.jobs.length > 0) {
            $scope.noJobsCreated = false;
            const jobs = [];
            resp.jobs.forEach(job => {
              if (job.groups && job.groups.length) {
                job.groups.forEach(group => {
                  jobs.push(createJob(`${group}.${job.job_id}`, group, job));
                });
              } else {
                jobs.push(createJob(job.job_id, null, job));
              }
            });
            normalizeTimes(jobs);
            $scope.jobs = jobs;
            const { groups, homeless } = createGroups($scope.jobs);
            $scope.groups = groups;
            $scope.homelessJobs = homeless;
            $scope.selected = {
              groups: [],
              jobs: []
            };

            // count all jobs, including duplicates in groups.
            // if it's the same as the number of ids passed in, tick all jobs
            const jobCount = resp.jobs.reduce((sum, job) => (sum + ((job.groups === undefined) ? 1 : job.groups.length)), 0);
            const selectAll = (jobCount === $scope.urlSelectedIds.jobs.length);

            // create the groups and jobs which are used in the menu
            groups.forEach(group => {
              $scope.selected.groups.push({
                id: group.id,
                selected: group.selected,
                // TODO: is the selectable property of a group still needed?
                selectable: group.selectable,
                timeRange: group.timeRange,
                isGroup: true,
              });
            });

            jobs.forEach(job => {
              if ($scope.selected.jobs.find(j => j.id === job.name) === undefined) {
                $scope.selected.jobs.push({
                  id: job.name,
                  selected: selectAll || job.selected,
                  disabled: job.disabled,
                  timeRange: job.timeRange,
                  running: job.running,
                  isGroup: false
                });
              }
            });

            $scope.allJobsSelected = areAllJobsSelected();
            $scope.allGroupsSelected = areAllGroupsSelected();
            createSelectedCount();

            // if in single selection mode, set the radio button controller ($scope.selectedJobRadio)
            // to the selected job id
            if ($scope.singleSelection === true) {
              $scope.jobs.forEach(j => {
                if (j.selected) {
                  $scope.selectedJobRadio = j.name;
                }
              });
            }
          } else {
            $scope.noJobsCreated = true;
          }
        }).catch((resp) => {
          console.log('mlJobSelectList controller - error getting job info from ES:', resp);
        });

      function createJob(jobId, groupId, job) {
        return {
          id: jobId,
          name: job.job_id,
          group: groupId,
          isGroup: false,
          selected: _.includes($scope.urlSelectedIds.jobs, job.job_id),
          disabled: !($scope.timeSeriesOnly === false || isTimeSeriesViewJob(job) === true),
          running: (job.datafeed_config && job.datafeed_config.state === 'started'),
          timeRange: {
            to: job.data_counts.latest_record_timestamp,
            from: job.data_counts.earliest_record_timestamp,
            fromPx: 0,
            toPx: 0,
            widthPx: 0,
            label: ''
          }
        };
      }

      function createGroups(jobsIn) {
        const jobGroups = {};
        const homeless = [];
        // first pull all of the groups out of all of the jobs
        // keeping homeless (groupless) jobs in a separate list
        jobsIn.forEach(job => {
          if (job.group !== null) {
            if (jobGroups[job.group] === undefined) {
              jobGroups[job.group] = [job];
            } else {
              jobGroups[job.group].push(job);
            }
          } else {
            homeless.push(job);
          }
        });

        const groups = _.map(jobGroups, (jobs, id) => {
          const group = {
            id,
            selected: false,
            selectable: true,
            expanded: false,
            isGroup: true,
            jobs
          };
          // check to see whether all of the groups jobs have been selected,
          // if they have, select the group
          if ($scope.singleSelection === false) {
            group.selected = _.includes($scope.urlSelectedIds.groups, id);
          }

          // create an over all time range for the group
          const timeRange = {
            to: null,
            toMoment: null,
            from: null,
            fromMoment: null,
            fromPx: null,
            toPx: null,
            widthPx: null,
          };

          jobs.forEach(job => {
            job.group = group;

            if (timeRange.to === null || job.timeRange.to > timeRange.to) {
              timeRange.to = job.timeRange.to;
              timeRange.toMoment = job.timeRange.toMoment;
            }
            if (timeRange.from === null || job.timeRange.from < timeRange.from) {
              timeRange.from = job.timeRange.from;
              timeRange.fromMoment = job.timeRange.fromMoment;
            }
            if (timeRange.toPx === null || job.timeRange.toPx > timeRange.toPx) {
              timeRange.toPx = job.timeRange.toPx;
            }
            if (timeRange.fromPx === null || job.timeRange.fromPx < timeRange.fromPx) {
              timeRange.fromPx = job.timeRange.fromPx;
            }
          });
          timeRange.widthPx = timeRange.toPx - timeRange.fromPx;
          timeRange.toMoment = moment(timeRange.to);
          timeRange.fromMoment = moment(timeRange.from);

          const fromString = timeRange.fromMoment.format('MMM Do YYYY, HH:mm');
          const toString =  timeRange.toMoment.format('MMM Do YYYY, HH:mm');
          timeRange.label = `${fromString} to ${toString}`;

          group.timeRange = timeRange;
          return group;
        });

        return {
          groups,
          homeless
        };
      }

      // apply the selected jobs
      $scope.apply = function () {
        // if in single selection mode, get the job id from $scope.selectedJobRadio
        const selectedJobs = [];
        if ($scope.singleSelection) {
          selectedJobs.push(...$scope.selected.jobs.filter(j => j.id === $scope.selectedJobRadio));
        } else {
          selectedJobs.push(...$scope.selected.jobs.filter(j => j.selected));
          selectedJobs.push(...$scope.selected.groups.filter(g => g.selected));
        }

        if (areAllJobsSelected()) {
          // if all jobs have been selected, just store '*' in the url
          mlJobSelectService.setJobIds(['*']);
        } else {
          const jobIds = selectedJobs.map(j => (j.isGroup ? `${j.id}.*` : j.id));
          mlJobSelectService.setJobIds(jobIds);
        }

        // if the apply time range checkbox is ticked,
        // find the min and max times for all selected jobs
        // and apply them to the timefilter
        if ($scope.applyTimeRange) {
          const times = [];
          selectedJobs.forEach(job => {
            if (job.timeRange.from !== undefined) {
              times.push(job.timeRange.from);
            }
            if (job.timeRange.to !== undefined) {
              times.push(job.timeRange.to);
            }
          });
          if (times.length) {
            const min = _.min(times);
            const max = _.max(times);
            timefilter.time.from = moment(min).toISOString();
            timefilter.time.to = moment(max).toISOString();
          }
        }
        mlJobSelectService.jobSelectListState.applyTimeRange = $scope.applyTimeRange;
        $scope.closePopover();
      };

      // ticking a job
      $scope.toggleSelection = function () {
        // check to see if all jobs are now selected
        $scope.allJobsSelected = areAllJobsSelected();
        $scope.allGroupsSelected = areAllGroupsSelected();
        createSelectedCount();
      };

      // ticking the all jobs checkbox
      $scope.toggleAllJobsSelection = function () {
        const allJobsSelected = areAllJobsSelected();
        $scope.allJobsSelected = !allJobsSelected;

        $scope.selected.jobs.forEach(job => {
          job.selected = $scope.allJobsSelected;
        });

        createSelectedCount();
      };

      // ticking a group
      $scope.toggleGroupSelection = function () {
        $scope.allGroupsSelected = areAllGroupsSelected();
        createSelectedCount();
      };

      // ticking the all jobs checkbox
      $scope.toggleAllGroupsSelection = function () {
        const allGroupsSelected = areAllGroupsSelected();
        $scope.allGroupsSelected = !allGroupsSelected;

        $scope.selected.groups.forEach(group => {
          group.selected = $scope.allGroupsSelected;
        });
        createSelectedCount();
      };

      // check to see whether all jobs in the list have been selected
      function areAllJobsSelected() {
        let allSelected = true;
        $scope.selected.jobs.forEach(job => {
          if (job.selected === false) {
            allSelected = false;
          }
        });
        return allSelected;
      }

      // check to see whether all groups in the list have been selected
      function areAllGroupsSelected() {
        let allSelected = true;
        $scope.selected.groups.forEach(group => {
          if (group.selected === false) {
            allSelected = false;
          }
        });
        return allSelected;
      }

      function createSelectedCount() {
        $scope.selectedCount = 0;
        $scope.selected.jobs.forEach(job => {
          if (job.selected) {
            $scope.selectedCount++;
          }
        });
        $scope.selected.groups.forEach(group => {
          if (group.selected) {
            $scope.selectedCount++;
          }
        });
      }

      // create the data used for the gant charts
      function normalizeTimes(jobs) {
        const min = _.min(jobs, job => +job.timeRange.from);
        const max = _.max(jobs, job => +job.timeRange.to);

        const gantScale = d3.scale.linear().domain([min.timeRange.from, max.timeRange.to]).range([1, 299]);

        jobs.forEach(job => {
          if (job.timeRange.to !== undefined && job.timeRange.from !== undefined) {
            job.timeRange.fromPx = gantScale(job.timeRange.from);
            job.timeRange.toPx = gantScale(job.timeRange.to);
            job.timeRange.widthPx = job.timeRange.toPx - job.timeRange.fromPx;

            job.timeRange.toMoment = moment(job.timeRange.to);
            job.timeRange.fromMoment = moment(job.timeRange.from);

            const fromString = job.timeRange.fromMoment.format('MMM Do YYYY, HH:mm');
            const toString = job.timeRange.toMoment.format('MMM Do YYYY, HH:mm');
            job.timeRange.label = `${fromString} to ${toString}`;
          }
        });

      }

      $scope.useTimeRange = function (job) {
        timefilter.time.from = job.timeRange.fromMoment.toISOString();
        timefilter.time.to = job.timeRange.toMoment.toISOString();
      };
    },
    link: function (scope, element, attrs) {
      scope.timeSeriesOnly = false;
      if (attrs.timeseriesonly === 'true') {
        scope.timeSeriesOnly = true;
      }

      if (attrs.singleSelection === 'true') {
        scope.singleSelection = true;
      }

      // Make a copy of the list of jobs ids
      // '*' is passed to indicate 'All jobs'.
      scope.urlSelectedIds = {
        groups: [...mlJobSelectService.groupIds],
        jobs: [...mlJobSelectService.jobIdsWithGroup],
      };

      // Giving the parent div focus fixes checkbox tick UI selection on IE.
      $('.ml-select-list', element).focus();
    }
  };
});
