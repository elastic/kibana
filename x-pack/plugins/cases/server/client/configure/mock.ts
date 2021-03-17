/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorField, ConnectorMappingsAttributes, ConnectorTypes } from '../../../common';
import {
  JiraGetFieldsResponse,
  ResilientGetFieldsResponse,
  ServiceNowGetFieldsResponse,
} from './utils.test';
interface TestMappings {
  [key: string]: ConnectorMappingsAttributes[];
}
export const mappings: TestMappings = {
  [ConnectorTypes.jira]: [
    {
      source: 'title',
      target: 'summary',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      action_type: 'append',
    },
  ],
  [`${ConnectorTypes.jira}-alt`]: [
    {
      source: 'title',
      target: 'title',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      action_type: 'append',
    },
  ],
  [ConnectorTypes.resilient]: [
    {
      source: 'title',
      target: 'name',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      action_type: 'append',
    },
  ],
  [ConnectorTypes.serviceNowITSM]: [
    {
      source: 'title',
      target: 'short_description',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'work_notes',
      action_type: 'append',
    },
  ],
  [ConnectorTypes.serviceNowSIR]: [
    {
      source: 'title',
      target: 'short_description',
      action_type: 'overwrite',
    },
    {
      source: 'description',
      target: 'description',
      action_type: 'overwrite',
    },
    {
      source: 'comments',
      target: 'work_notes',
      action_type: 'append',
    },
  ],
};

const jiraFields: JiraGetFieldsResponse = {
  summary: {
    required: true,
    allowedValues: [],
    defaultValue: {},
    schema: {
      type: 'string',
    },
    name: 'Summary',
  },
  issuetype: {
    required: true,
    allowedValues: [
      {
        self: 'https://siem-kibana.atlassian.net/rest/api/2/issuetype/10023',
        id: '10023',
        description: 'A problem or error.',
        iconUrl:
          'https://siem-kibana.atlassian.net/secure/viewavatar?size=medium&avatarId=10303&avatarType=issuetype',
        name: 'Bug',
        subtask: false,
        avatarId: 10303,
      },
    ],
    defaultValue: {},
    schema: {
      type: 'issuetype',
    },
    name: 'Issue Type',
  },
  attachment: {
    required: false,
    allowedValues: [],
    defaultValue: {},
    schema: {
      type: 'array',
      items: 'attachment',
    },
    name: 'Attachment',
  },
  duedate: {
    required: false,
    allowedValues: [],
    defaultValue: {},
    schema: {
      type: 'date',
    },
    name: 'Due date',
  },
  description: {
    required: false,
    allowedValues: [],
    defaultValue: {},
    schema: {
      type: 'string',
    },
    name: 'Description',
  },
  project: {
    required: true,
    allowedValues: [
      {
        self: 'https://siem-kibana.atlassian.net/rest/api/2/project/10015',
        id: '10015',
        key: 'RJ2',
        name: 'RJ2',
        projectTypeKey: 'business',
        simplified: false,
        avatarUrls: {
          '48x48':
            'https://siem-kibana.atlassian.net/secure/projectavatar?pid=10015&avatarId=10412',
          '24x24':
            'https://siem-kibana.atlassian.net/secure/projectavatar?size=small&s=small&pid=10015&avatarId=10412',
          '16x16':
            'https://siem-kibana.atlassian.net/secure/projectavatar?size=xsmall&s=xsmall&pid=10015&avatarId=10412',
          '32x32':
            'https://siem-kibana.atlassian.net/secure/projectavatar?size=medium&s=medium&pid=10015&avatarId=10412',
        },
      },
    ],
    defaultValue: {},
    schema: {
      type: 'project',
    },
    name: 'Project',
  },
  assignee: {
    required: false,
    allowedValues: [],
    defaultValue: {},
    schema: {
      type: 'user',
    },
    name: 'Assignee',
  },
  labels: {
    required: false,
    allowedValues: [],
    defaultValue: {},
    schema: {
      type: 'array',
      items: 'string',
    },
    name: 'Labels',
  },
};
const resilientFields: ResilientGetFieldsResponse = [
  { input_type: 'text', name: 'addr', read_only: false, text: 'Address' },
  {
    input_type: 'boolean',
    name: 'alberta_health_risk_assessment',
    read_only: false,
    text: 'Alberta Health Risk Assessment',
  },
  { input_type: 'number', name: 'hard_liability', read_only: true, text: 'Assessed Liability' },
  { input_type: 'text', name: 'city', read_only: false, text: 'City' },
  { input_type: 'select', name: 'country', read_only: false, text: 'Country/Region' },
  { input_type: 'select_owner', name: 'creator_id', read_only: true, text: 'Created By' },
  { input_type: 'select', name: 'crimestatus_id', read_only: false, text: 'Criminal Activity' },
  { input_type: 'boolean', name: 'data_encrypted', read_only: false, text: 'Data Encrypted' },
  { input_type: 'select', name: 'data_format', read_only: false, text: 'Data Format' },
  { input_type: 'datetimepicker', name: 'end_date', read_only: true, text: 'Date Closed' },
  { input_type: 'datetimepicker', name: 'create_date', read_only: true, text: 'Date Created' },
  {
    input_type: 'datetimepicker',
    name: 'determined_date',
    read_only: false,
    text: 'Date Determined',
  },
  {
    input_type: 'datetimepicker',
    name: 'discovered_date',
    read_only: false,
    required: 'always',
    text: 'Date Discovered',
  },
  { input_type: 'datetimepicker', name: 'start_date', read_only: false, text: 'Date Occurred' },
  { input_type: 'select', name: 'exposure_dept_id', read_only: false, text: 'Department' },
  { input_type: 'textarea', name: 'description', read_only: false, text: 'Description' },
  { input_type: 'boolean', name: 'employee_involved', read_only: false, text: 'Employee Involved' },
  { input_type: 'boolean', name: 'data_contained', read_only: false, text: 'Exposure Resolved' },
  { input_type: 'select', name: 'exposure_type_id', read_only: false, text: 'Exposure Type' },
  {
    input_type: 'multiselect',
    name: 'gdpr_breach_circumstances',
    read_only: false,
    text: 'GDPR Breach Circumstances',
  },
  { input_type: 'select', name: 'gdpr_breach_type', read_only: false, text: 'GDPR Breach Type' },
  {
    input_type: 'textarea',
    name: 'gdpr_breach_type_comment',
    read_only: false,
    text: 'GDPR Breach Type Comment',
  },
  { input_type: 'select', name: 'gdpr_consequences', read_only: false, text: 'GDPR Consequences' },
  {
    input_type: 'textarea',
    name: 'gdpr_consequences_comment',
    read_only: false,
    text: 'GDPR Consequences Comment',
  },
  {
    input_type: 'select',
    name: 'gdpr_final_assessment',
    read_only: false,
    text: 'GDPR Final Assessment',
  },
  {
    input_type: 'textarea',
    name: 'gdpr_final_assessment_comment',
    read_only: false,
    text: 'GDPR Final Assessment Comment',
  },
  {
    input_type: 'select',
    name: 'gdpr_identification',
    read_only: false,
    text: 'GDPR Identification',
  },
  {
    input_type: 'textarea',
    name: 'gdpr_identification_comment',
    read_only: false,
    text: 'GDPR Identification Comment',
  },
  {
    input_type: 'select',
    name: 'gdpr_personal_data',
    read_only: false,
    text: 'GDPR Personal Data',
  },
  {
    input_type: 'textarea',
    name: 'gdpr_personal_data_comment',
    read_only: false,
    text: 'GDPR Personal Data Comment',
  },
  {
    input_type: 'boolean',
    name: 'gdpr_subsequent_notification',
    read_only: false,
    text: 'GDPR Subsequent Notification',
  },
  { input_type: 'number', name: 'id', read_only: true, text: 'ID' },
  { input_type: 'boolean', name: 'impact_likely', read_only: false, text: 'Impact Likely' },
  {
    input_type: 'boolean',
    name: 'ny_impact_likely',
    read_only: false,
    text: 'Impact Likely for New York',
  },
  {
    input_type: 'boolean',
    name: 'or_impact_likely',
    read_only: false,
    text: 'Impact Likely for Oregon',
  },
  {
    input_type: 'boolean',
    name: 'wa_impact_likely',
    read_only: false,
    text: 'Impact Likely for Washington',
  },
  { input_type: 'boolean', name: 'confirmed', read_only: false, text: 'Incident Disposition' },
  { input_type: 'multiselect', name: 'incident_type_ids', read_only: false, text: 'Incident Type' },
  {
    input_type: 'text',
    name: 'exposure_individual_name',
    read_only: false,
    text: 'Individual Name',
  },
  {
    input_type: 'select',
    name: 'harmstatus_id',
    read_only: false,
    text: 'Is harm/risk/misuse foreseeable?',
  },
  { input_type: 'text', name: 'jurisdiction_name', read_only: false, text: 'Jurisdiction' },
  {
    input_type: 'datetimepicker',
    name: 'inc_last_modified_date',
    read_only: true,
    text: 'Last Modified',
  },
  {
    input_type: 'multiselect',
    name: 'gdpr_lawful_data_processing_categories',
    read_only: false,
    text: 'Lawful Data Processing Categories',
  },
  { input_type: 'multiselect_members', name: 'members', read_only: false, text: 'Members' },
  { input_type: 'text', name: 'name', read_only: false, required: 'always', text: 'Name' },
  { input_type: 'boolean', name: 'negative_pr_likely', read_only: false, text: 'Negative PR' },
  { input_type: 'datetimepicker', name: 'due_date', read_only: true, text: 'Next Due Date' },
  {
    input_type: 'multiselect',
    name: 'nist_attack_vectors',
    read_only: false,
    text: 'NIST Attack Vectors',
  },
  { input_type: 'select', name: 'org_handle', read_only: true, text: 'Organization' },
  { input_type: 'select_owner', name: 'owner_id', read_only: false, text: 'Owner' },
  { input_type: 'select', name: 'phase_id', read_only: true, text: 'Phase' },
  {
    input_type: 'select',
    name: 'pipeda_other_factors',
    read_only: false,
    text: 'PIPEDA Other Factors',
  },
  {
    input_type: 'textarea',
    name: 'pipeda_other_factors_comment',
    read_only: false,
    text: 'PIPEDA Other Factors Comment',
  },
  {
    input_type: 'select',
    name: 'pipeda_overall_assessment',
    read_only: false,
    text: 'PIPEDA Overall Assessment',
  },
  {
    input_type: 'textarea',
    name: 'pipeda_overall_assessment_comment',
    read_only: false,
    text: 'PIPEDA Overall Assessment Comment',
  },
  {
    input_type: 'select',
    name: 'pipeda_probability_of_misuse',
    read_only: false,
    text: 'PIPEDA Probability of Misuse',
  },
  {
    input_type: 'textarea',
    name: 'pipeda_probability_of_misuse_comment',
    read_only: false,
    text: 'PIPEDA Probability of Misuse Comment',
  },
  {
    input_type: 'select',
    name: 'pipeda_sensitivity_of_pi',
    read_only: false,
    text: 'PIPEDA Sensitivity of PI',
  },
  {
    input_type: 'textarea',
    name: 'pipeda_sensitivity_of_pi_comment',
    read_only: false,
    text: 'PIPEDA Sensitivity of PI Comment',
  },
  { input_type: 'text', name: 'reporter', read_only: false, text: 'Reporting Individual' },
  {
    input_type: 'select',
    name: 'resolution_id',
    read_only: false,
    required: 'close',
    text: 'Resolution',
  },
  {
    input_type: 'textarea',
    name: 'resolution_summary',
    read_only: false,
    required: 'close',
    text: 'Resolution Summary',
  },
  { input_type: 'select', name: 'gdpr_harm_risk', read_only: false, text: 'Risk of Harm' },
  { input_type: 'select', name: 'severity_code', read_only: false, text: 'Severity' },
  { input_type: 'boolean', name: 'inc_training', read_only: true, text: 'Simulation' },
  { input_type: 'multiselect', name: 'data_source_ids', read_only: false, text: 'Source of Data' },
  { input_type: 'select', name: 'state', read_only: false, text: 'State' },
  { input_type: 'select', name: 'plan_status', read_only: false, text: 'Status' },
  { input_type: 'select', name: 'exposure_vendor_id', read_only: false, text: 'Vendor' },
  {
    input_type: 'boolean',
    name: 'data_compromised',
    read_only: false,
    text: 'Was personal information or personal data involved?',
  },
  {
    input_type: 'select',
    name: 'workspace',
    read_only: false,
    required: 'always',
    text: 'Workspace',
  },
  { input_type: 'text', name: 'zip', read_only: false, text: 'Zip' },
];
const serviceNowFields: ServiceNowGetFieldsResponse = [
  {
    column_label: 'Approval',
    mandatory: 'false',
    max_length: '40',
    element: 'approval',
  },
  {
    column_label: 'Close notes',
    mandatory: 'false',
    max_length: '4000',
    element: 'close_notes',
  },
  {
    column_label: 'Contact type',
    mandatory: 'false',
    max_length: '40',
    element: 'contact_type',
  },
  {
    column_label: 'Correlation display',
    mandatory: 'false',
    max_length: '100',
    element: 'correlation_display',
  },
  {
    column_label: 'Correlation ID',
    mandatory: 'false',
    max_length: '100',
    element: 'correlation_id',
  },
  {
    column_label: 'Description',
    mandatory: 'false',
    max_length: '4000',
    element: 'description',
  },
  {
    column_label: 'Number',
    mandatory: 'false',
    max_length: '40',
    element: 'number',
  },
  {
    column_label: 'Short description',
    mandatory: 'false',
    max_length: '160',
    element: 'short_description',
  },
  {
    column_label: 'Created by',
    mandatory: 'false',
    max_length: '40',
    element: 'sys_created_by',
  },
  {
    column_label: 'Updated by',
    mandatory: 'false',
    max_length: '40',
    element: 'sys_updated_by',
  },
  {
    column_label: 'Upon approval',
    mandatory: 'false',
    max_length: '40',
    element: 'upon_approval',
  },
  {
    column_label: 'Upon reject',
    mandatory: 'false',
    max_length: '40',
    element: 'upon_reject',
  },
];
interface FormatFieldsTestData {
  expected: ConnectorField[];
  fields: JiraGetFieldsResponse | ResilientGetFieldsResponse | ServiceNowGetFieldsResponse;
  type: ConnectorTypes;
}
export const formatFieldsTestData: FormatFieldsTestData[] = [
  {
    expected: [
      { id: 'summary', name: 'Summary', required: true, type: 'text' },
      { id: 'description', name: 'Description', required: false, type: 'text' },
    ],
    fields: jiraFields,
    type: ConnectorTypes.jira,
  },
  {
    expected: [
      { id: 'addr', name: 'Address', required: false, type: 'text' },
      { id: 'city', name: 'City', required: false, type: 'text' },
      { id: 'description', name: 'Description', required: false, type: 'textarea' },
      {
        id: 'gdpr_breach_type_comment',
        name: 'GDPR Breach Type Comment',
        required: false,
        type: 'textarea',
      },
      {
        id: 'gdpr_consequences_comment',
        name: 'GDPR Consequences Comment',
        required: false,
        type: 'textarea',
      },
      {
        id: 'gdpr_final_assessment_comment',
        name: 'GDPR Final Assessment Comment',
        required: false,
        type: 'textarea',
      },
      {
        id: 'gdpr_identification_comment',
        name: 'GDPR Identification Comment',
        required: false,
        type: 'textarea',
      },
      {
        id: 'gdpr_personal_data_comment',
        name: 'GDPR Personal Data Comment',
        required: false,
        type: 'textarea',
      },
      { id: 'exposure_individual_name', name: 'Individual Name', required: false, type: 'text' },
      { id: 'jurisdiction_name', name: 'Jurisdiction', required: false, type: 'text' },
      { id: 'name', name: 'Name', required: true, type: 'text' },
      {
        id: 'pipeda_other_factors_comment',
        name: 'PIPEDA Other Factors Comment',
        required: false,
        type: 'textarea',
      },
      {
        id: 'pipeda_overall_assessment_comment',
        name: 'PIPEDA Overall Assessment Comment',
        required: false,
        type: 'textarea',
      },
      {
        id: 'pipeda_probability_of_misuse_comment',
        name: 'PIPEDA Probability of Misuse Comment',
        required: false,
        type: 'textarea',
      },
      {
        id: 'pipeda_sensitivity_of_pi_comment',
        name: 'PIPEDA Sensitivity of PI Comment',
        required: false,
        type: 'textarea',
      },
      { id: 'reporter', name: 'Reporting Individual', required: false, type: 'text' },
      { id: 'resolution_summary', name: 'Resolution Summary', required: false, type: 'textarea' },
      { id: 'zip', name: 'Zip', required: false, type: 'text' },
    ],
    fields: resilientFields,
    type: ConnectorTypes.resilient,
  },
  {
    expected: [
      { id: 'approval', name: 'Approval', required: false, type: 'text' },
      { id: 'close_notes', name: 'Close notes', required: false, type: 'textarea' },
      { id: 'contact_type', name: 'Contact type', required: false, type: 'text' },
      { id: 'correlation_display', name: 'Correlation display', required: false, type: 'text' },
      { id: 'correlation_id', name: 'Correlation ID', required: false, type: 'text' },
      { id: 'description', name: 'Description', required: false, type: 'textarea' },
      { id: 'number', name: 'Number', required: false, type: 'text' },
      { id: 'short_description', name: 'Short description', required: false, type: 'text' },
      { id: 'sys_created_by', name: 'Created by', required: false, type: 'text' },
      { id: 'sys_updated_by', name: 'Updated by', required: false, type: 'text' },
      { id: 'upon_approval', name: 'Upon approval', required: false, type: 'text' },
      { id: 'upon_reject', name: 'Upon reject', required: false, type: 'text' },
    ],
    fields: serviceNowFields,
    type: ConnectorTypes.serviceNowITSM,
  },
  {
    expected: [
      { id: 'approval', name: 'Approval', required: false, type: 'text' },
      { id: 'close_notes', name: 'Close notes', required: false, type: 'textarea' },
      { id: 'contact_type', name: 'Contact type', required: false, type: 'text' },
      { id: 'correlation_display', name: 'Correlation display', required: false, type: 'text' },
      { id: 'correlation_id', name: 'Correlation ID', required: false, type: 'text' },
      { id: 'description', name: 'Description', required: false, type: 'textarea' },
      { id: 'number', name: 'Number', required: false, type: 'text' },
      { id: 'short_description', name: 'Short description', required: false, type: 'text' },
      { id: 'sys_created_by', name: 'Created by', required: false, type: 'text' },
      { id: 'sys_updated_by', name: 'Updated by', required: false, type: 'text' },
      { id: 'upon_approval', name: 'Upon approval', required: false, type: 'text' },
      { id: 'upon_reject', name: 'Upon reject', required: false, type: 'text' },
    ],
    fields: serviceNowFields,
    type: ConnectorTypes.serviceNowSIR,
  },
];
export const mockGetFieldsResponse = {
  status: 'ok',
  data: jiraFields,
  actionId: '123',
};

export const actionsErrResponse = {
  status: 'error',
  serviceMessage: 'this is an actions error',
};
