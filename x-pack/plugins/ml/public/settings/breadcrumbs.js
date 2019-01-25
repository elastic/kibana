/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ML_BREADCRUMB } from '../breadcrumbs';


export function getSettingsBreadcrumbs() {
  // Whilst top level nav menu with tabs remains,
  // use root ML breadcrumb.
  return [
    ML_BREADCRUMB
  ];
}

export function getCalendarManagementBreadcrumbs() {
  return [
    ...getSettingsBreadcrumbs(),
    {
      text: 'Calendar management',
      href: '#/settings/calendars_list'
    }
  ];
}

export function getCreateCalendarBreadcrumbs() {
  return [
    ...getCalendarManagementBreadcrumbs(),
    {
      text: 'Create',
      href: '#/settings/calendars_list/new_calendar'
    }
  ];
}

export function getEditCalendarBreadcrumbs() {
  return [
    ...getCalendarManagementBreadcrumbs(),
    {
      text: 'Edit',
      href: '#/settings/calendars_list/edit_calendar'
    }
  ];
}

export function getFilterListsBreadcrumbs() {
  return [
    ...getSettingsBreadcrumbs(),
    {
      text: 'Filter lists',
      href: '#/settings/filter_lists'
    }
  ];
}

export function getCreateFilterListBreadcrumbs() {
  return [
    ...getFilterListsBreadcrumbs(),
    {
      text: 'Create',
      href: '#/settings/filter_lists/new'
    }
  ];
}

export function getEditFilterListBreadcrumbs() {
  return [
    ...getFilterListsBreadcrumbs(),
    {
      text: 'Edit',
      href: '#/settings/filter_lists/edit'
    }
  ];
}
