/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const resilientFields = [
  {
    name: 'name',
    text: 'name',
    input_type: 'text',
    required: 'always',
    read_only: false,
  },
  {
    name: 'description',
    text: 'Description',
    input_type: 'textarea',
    read_only: false,
  },
  {
    name: 'create_date',
    text: 'Date Created',
    input_type: 'datetimepicker',
    read_only: true,
  },
];

export const incidentTypes = {
  id: 16,
  name: 'incident_type_ids',
  text: 'Incident Type',
  values: [
    {
      value: 17,
      label: 'Communication error (fax; email)',
      enabled: true,
      properties: null,
      uuid: '4a8d22f7-d89e-4403-85c7-2bafe3b7f2ae',
      hidden: false,
      default: false,
    },
    {
      value: 1001,
      label: 'Custom type',
      enabled: true,
      properties: null,
      uuid: '3b51c8c2-9758-48f8-b013-bd141f1d2ec9',
      hidden: false,
      default: false,
    },
  ],
};

export const severity = [
  {
    value: 4,
    label: 'Low',
    enabled: true,
    properties: null,
    uuid: '97cae239-963d-4e36-be34-07e47ef2cc86',
    hidden: false,
    default: true,
  },
  {
    value: 5,
    label: 'Medium',
    enabled: true,
    properties: null,
    uuid: 'c2c354c9-6d1e-4a48-82e5-bd5dc5068339',
    hidden: false,
    default: false,
  },
  {
    value: 6,
    label: 'High',
    enabled: true,
    properties: null,
    uuid: '93e5c99c-563b-48b9-80a3-9572307622d8',
    hidden: false,
    default: false,
  },
];
