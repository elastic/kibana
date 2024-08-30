/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ComparisonSide } from './comparison_side';
import type {
  ThreeWayDiff,
  DiffableAllFields,
  RuleKqlQuery,
} from '../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  ThreeWayDiffConflict,
  KqlQueryType,
} from '../../../../../../../common/api/detection_engine';
export default {
  component: ComparisonSide,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/ComparisonSide',
  argTypes: {
    fieldName: {
      control: 'text',
      description: 'Field name to compare',
    },
    fieldThreeWayDiff: {
      control: 'object',
      description: 'Field ThreeWayDiff',
    },
    resolvedValue: {
      control: 'text',
      description: 'Resolved value',
    },
  },
};

interface TemplateProps<FieldName extends keyof DiffableAllFields> {
  fieldName: FieldName;
  fieldThreeWayDiff: ThreeWayDiff<DiffableAllFields[FieldName]>;
  resolvedValue?: DiffableAllFields[FieldName];
}

const Template: Story<TemplateProps<keyof DiffableAllFields>> = (args) => {
  return (
    <ComparisonSide
      fieldName={args.fieldName}
      fieldThreeWayDiff={args.fieldThreeWayDiff}
      resolvedValue={args.resolvedValue}
    />
  );
};

export const NoBaseVersion = Template.bind({});
NoBaseVersion.args = {
  fieldName: 'rule_name_override',
  fieldThreeWayDiff: {
    has_base_version: false,
    base_version: undefined,
    current_version: {
      field_name: 'rule.name',
    },
    target_version: undefined,
    merged_version: undefined,
    diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Target,
    has_update: true,
    conflict: ThreeWayDiffConflict.SOLVABLE,
  },
};

export const WithResolvedValue = Template.bind({});
WithResolvedValue.args = {
  fieldName: 'risk_score',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version: 10,
    current_version: 40,
    target_version: 20,
    merged_version: 40,
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Current,
    has_update: true,
    conflict: ThreeWayDiffConflict.NON_SOLVABLE,
  },
  resolvedValue: 35,
};
WithResolvedValue.argTypes = {
  resolvedValue: {
    control: 'number',
  },
};

/* Optional field becomes defined - was undefined in base version, but was then defined by user in current version */
export const OptionalFieldBecomesDefined = Template.bind({});
OptionalFieldBecomesDefined.args = {
  fieldName: 'timestamp_override',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version: undefined,
    current_version: {
      field_name: 'event.ingested',
      fallback_disabled: true,
    },
    target_version: undefined,
    merged_version: {
      field_name: 'event.ingested',
      fallback_disabled: true,
    },
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
    merge_outcome: ThreeWayMergeOutcome.Current,
    has_update: false,
    conflict: ThreeWayDiffConflict.NONE,
  },
};

export const SubfieldsWithLabels = Template.bind({});

const subfieldsWithLabelsThreeWayDiff: ThreeWayDiff<RuleKqlQuery> = {
  has_base_version: true,
  base_version: {
    type: KqlQueryType.inline_query,
    query: 'event.agent_id_status: *',
    language: 'kuery',
    filters: [],
  },
  current_version: {
    type: KqlQueryType.inline_query,
    query: 'event.agent_id_status: *',
    language: 'kuery',
    filters: [],
  },
  target_version: {
    type: KqlQueryType.saved_query,
    saved_query_id: 'e355ef26-45f5-40f1-bbb7-5176ecf07d5c',
  },
  merged_version: {
    type: KqlQueryType.saved_query,
    saved_query_id: 'e355ef26-45f5-40f1-bbb7-5176ecf07d5c',
  },
  diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
  merge_outcome: ThreeWayMergeOutcome.Target,
  has_update: true,
  conflict: ThreeWayDiffConflict.NONE,
};

SubfieldsWithLabels.args = {
  fieldName: 'kql_query',
  fieldThreeWayDiff: subfieldsWithLabelsThreeWayDiff,
};

/* Field type changes - in this example "kql_query" field was "inline" in base version, but became "saved" in the current version */
export const FieldTypeChanges = Template.bind({});

const fieldTypeChangesThreeWayDiff: ThreeWayDiff<RuleKqlQuery> = {
  has_base_version: true,
  base_version: {
    type: KqlQueryType.inline_query,
    query: 'event.agent_id_status: *',
    language: 'kuery',
    filters: [],
  },
  current_version: {
    type: KqlQueryType.saved_query,
    saved_query_id: 'e355ef26-45f5-40f1-bbb7-5176ecf07d5c',
  },
  target_version: {
    type: KqlQueryType.inline_query,
    query: 'event.agent_id_status: *',
    language: 'kuery',
    filters: [],
  },
  merged_version: {
    type: KqlQueryType.saved_query,
    saved_query_id: 'e355ef26-45f5-40f1-bbb7-5176ecf07d5c',
  },
  diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
  merge_outcome: ThreeWayMergeOutcome.Current,
  has_update: false,
  conflict: ThreeWayDiffConflict.NONE,
};

FieldTypeChanges.args = {
  fieldName: 'kql_query',
  fieldThreeWayDiff: fieldTypeChangesThreeWayDiff,
};

export const SingleLineStringSubfieldChanges = Template.bind({});
SingleLineStringSubfieldChanges.args = {
  fieldName: 'name',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version: 'Prebuilt rule',
    current_version: 'Customized prebuilt rule',
    target_version: 'Prebuilt rule with new changes',
    merged_version: 'Customized prebuilt rule',
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Current,
    has_update: true,
    conflict: ThreeWayDiffConflict.NON_SOLVABLE,
  },
};

export const MultiLineStringSubfieldChanges = Template.bind({});
MultiLineStringSubfieldChanges.args = {
  fieldName: 'note',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version: 'My description.\f\nThis is a second\u2001 line.\f\nThis is a third line.',
    current_version:
      'My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a third line.',
    target_version: 'My description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.',
    merged_version:
      'My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.',
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Merged,
    has_update: true,
    conflict: ThreeWayDiffConflict.SOLVABLE,
  },
};

export const NumberSubfieldChanges = Template.bind({});
NumberSubfieldChanges.args = {
  fieldName: 'risk_score',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version: 33,
    current_version: 43,
    target_version: 53,
    merged_version: 43,
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Current,
    has_update: true,
    conflict: ThreeWayDiffConflict.NON_SOLVABLE,
  },
};

export const ArraySubfieldChanges = Template.bind({});
ArraySubfieldChanges.args = {
  fieldName: 'tags',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version: ['one', 'two', 'three'],
    current_version: ['two', 'three', 'four', 'five'],
    target_version: ['one', 'three', 'four', 'six'],
    merged_version: ['three', 'four', 'five', 'six'],
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Current,
    has_update: true,
    conflict: ThreeWayDiffConflict.SOLVABLE,
  },
};

export const QuerySubfieldChanges = Template.bind({});
QuerySubfieldChanges.args = {
  fieldName: 'kql_query',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version: {
      type: KqlQueryType.inline_query,
      query:
        'event.action:("Directory Service Changes" or "directory-service-object-modified") and event.code:5136 and\n  winlog.event_data.OperationType:"%%14674" and\n  winlog.event_data.ObjectClass:"user" and\n  winlog.event_data.AttributeLDAPDisplayName:"servicePrincipalName"\n',
      language: 'kuery',
      filters: [],
    },
    current_version: {
      type: KqlQueryType.inline_query,
      query:
        'event.action:("Directory Service Changes" or "directory-service-object-modified") and event.code:5136 and\n  winlog.event_data.OperationType:"%%14674" or winlog.event_data.OperationType:"%%14675" and\n  winlog.event_data.ObjectClass:"user" and\n  winlog.event_data.AttributeLDAPDisplayName:"serviceSecondaryName"\n',
      language: 'kuery',
      filters: [],
    },
    target_version: {
      type: KqlQueryType.inline_query,
      query:
        'event.action:("Directory Service Changes" or "Directory Service Modifications" or "directory-service-object-modified") and event.code:5136 and\n  winlog.event_data.OperationType:"%%14674" and\n  winlog.event_data.ObjectClass:"user" and\n  winlog.event_data.AttributeLDAPDisplayName:"servicePrincipalName"\n',
      language: 'kuery',
      filters: [],
    },
    merged_version: {
      type: KqlQueryType.inline_query,
      query:
        'event.action:("Directory Service Changes" or "directory-service-object-modified") and event.code:5136 and\n  winlog.event_data.OperationType:"%%14674" or winlog.event_data.OperationType:"%%14675" and\n  winlog.event_data.ObjectClass:"user" and\n  winlog.event_data.AttributeLDAPDisplayName:"serviceSecondaryName"\n',
      language: 'kuery',
      filters: [],
    },
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Current,
    has_update: true,
    conflict: ThreeWayDiffConflict.NON_SOLVABLE,
  },
};

export const SetupGuideSubfieldChanges = Template.bind({});
SetupGuideSubfieldChanges.args = {
  fieldName: 'setup',
  fieldThreeWayDiff: {
    has_base_version: true,
    base_version:
      '## Setup\n\nThis rule requires data coming in from one of the following integrations:\n- Elastic Defend\n- Auditbeat\n\n### Elastic Defend Integration Setup\nElastic Defend is integrated into the Elastic Agent using Fleet. Upon configuration, the integration allows the Elastic Agent to monitor events on your host and send data to the Elastic Security app.\n\n#### Prerequisite Requirements:\n- Fleet is required for Elastic Defend.\n- To configure Fleet Server refer to the [documentation](https://www.elastic.co/guide/en/fleet/current/fleet-server.html).\n\n#### The following steps should be executed in order to add the Elastic Defend integration on a Linux System:\n- Go to the Kibana home page and click "Add integrations".\n- In the query bar, search for "Elastic Defend" and select the integration to see more details about it.\n- Click "Add Elastic Defend".\n- Configure the integration name and optionally add a description.\n- Select the type of environment you want to protect, either "Traditional Endpoints" or "Cloud Workloads".\n- Select a configuration preset. Each preset comes with different default settings for Elastic Agent, you can further customize these later by configuring the Elastic Defend integration policy. [Helper guide](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html).\n- We suggest selecting "Complete EDR (Endpoint Detection and Response)" as a configuration setting, that provides "All events; all preventions"\n- Enter a name for the agent policy in "New agent policy name". If other agent policies already exist, you can click the "Existing hosts" tab and select an existing policy instead.\nFor more details on Elastic Agent configuration settings, refer to the [helper guide](https://www.elastic.co/guide/en/fleet/8.10/agent-policy.html).\n- Click "Save and Continue".\n- To complete the integration, select "Add Elastic Agent to your hosts" and continue to the next section to install the Elastic Agent on your hosts.\nFor more details on Elastic Defend refer to the [helper guide](https://www.elastic.co/guide/en/security/current/install-endpoint.html).\n\n### Auditbeat Setup\nAuditbeat is a lightweight shipper that you can install on your servers to audit the activities of users and processes on your systems. For example, you can use Auditbeat to collect and centralize audit events from the Linux Audit Framework. You can also use Auditbeat to detect changes to critical files, like binaries and configuration files, and identify potential security policy violations.\n\n#### The following steps should be executed in order to add the Auditbeat on a Linux System:\n- Elastic provides repositories available for APT and YUM-based distributions. Note that we provide binary packages, but no source packages.\n- To install the APT and YUM repositories follow the setup instructions in this [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setup-repositories.html).\n- To run Auditbeat on Docker follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-docker.html).\n- To run Auditbeat on Kubernetes follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-kubernetes.html).\n- For complete “Setup and Run Auditbeat” information refer to the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setting-up-and-running.html).\n',
    current_version:
      '## Setup\n\nThis rule requires data coming in from one of the following integrations:\n- Elastic Defend\n- Auditbeat\n- Custom Windows Event Logs\n\n### Elastic Defend Integration Setup\nElastic Defend is integrated into the Elastic Agent using Fleet. Upon configuration, the integration allows the Elastic Agent to monitor events on your host and send data to the Elastic Security app.\n\n#### Prerequisite Requirements:\n- Fleet is required for Elastic Defend.\n- To configure Fleet Server refer to the [documentation](https://www.elastic.co/guide/en/fleet/current/fleet-server.html).\n\n#### The following steps should be executed in order to add the Elastic Defend integration on a Linux System:\n- Go to the Kibana home page and click "Add integrations".\n- In the query bar, search for "Elastic Defend" and select the integration to see more details about it.\n- Click "Add Elastic Defend".\n- Configure the integration name and optionally add a description.\n- Select the type of environment you want to protect.\n- Select a configuration preset. Each preset comes with different default settings for Elastic Agent, you can further customize these later by configuring the Elastic Defend integration policy. [Helper guide](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html).\n- Enter a name for the agent policy in "New agent policy name". If other agent policies already exist, you can click the "Existing hosts" tab and select an existing policy instead.\nFor more details on Elastic Agent configuration settings, refer to the [helper guide](https://www.elastic.co/guide/en/fleet/8.10/agent-policy.html).\n- Click "Save and Continue".\n- The rule is now ready to run.\n- To complete the integration, select "Add Elastic Agent to your hosts" and continue to the next section to install the Elastic Agent on your hosts.\nFor more details on Elastic Defend refer to the [helper guide](https://www.elastic.co/guide/en/security/current/install-endpoint.html).\n\n### Auditbeat Setup\nAuditbeat is a lightweight shipper that you can install on your servers to audit the activities of users and processes on your systems. For example, you can use Auditbeat to collect and centralize audit events from the Linux Audit Framework. You can also use Auditbeat to detect changes to critical files, like binaries and configuration files, and identify potential security policy violations.\n\n#### The following steps should be executed in order to add the Auditbeat on a Linux System:\n- Elastic provides repositories available for AXT and YUM-based distributions. Note that we provide binary packages, but no source packages.\n- To install the AXT and YUM repositories follow the setup instructions in this [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setup-repositories.html).\n- To run Auditbeat on Docker follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-docker.html).\n- To run Auditbeat on Kubernetes follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-kubernetes.html).\n- For complete “Setup and Run Auditbeat” information refer to the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setting-up-and-running.html).\n',
    target_version:
      '## Setup\n\nThis rule requires data coming in from one of the following integrations:\n- Elastic Defend\n- Auditbeat\n\n### Elastic Defend Integration Setup\nElastic Defend is integrated into the Elastic Agent using Fleet. Upon configuration, the integration allows the Elastic Agent to monitor events on your host and send data to the Elastic Security app.\n\n#### Prerequisite Requirements:\n- Fleet is required for Elastic Defend.\n- To configure Fleet Server refer to the [documentation](https://www.elastic.co/guide/en/fleet/current/fleet-server.html).\n\n#### The following steps should be executed in order to add the Elastic Defend integration on a Linux System:\n- Go to the Kibana home page and click "Add integrations".\n- In the query bar, search for "Elastic Defend" and select the integration to see more details about it.\n- Click "Add Elastic Defend".\n- Configure the integration name and optionally add a description.\n- Select the type of environment you want to protect, either "Traditional Endpoints" or "Cloud Workloads".\n- Carefully select a configuration preset. Each preset comes with different default settings for Elastic Agent, you can further customize these later by configuring the Elastic Defend integration policy. [Helper guide](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html).\n- We suggest selecting "Complete EDR (Endpoint Detection and Response)" as a configuration setting, that provides "All events; all preventions"\n- Enter a title for the agent policy in "New agent policy title". If other agent policies already exist, you can click the "Existing hosts" tab and select an existing policy instead.\nFor more details on Elastic Agent configuration settings, refer to the [helper guide](https://www.elastic.co/guide/en/fleet/8.10/agent-policy.html).\n- Click "Save and Continue".\n- To complete the integration, select "Add Elastic Agent to your hosts" and continue to the next section to install the Elastic Agent on your hosts.\nFor more details on Elastic Defend refer to the [helper guide](https://www.elastic.co/guide/en/security/current/install-endpoint.html).\n\n### Auditbeat Setup\nAuditbeat is a lightweight shipper that you can install on your servers to audit the activities of users and processes on your systems. You can use Auditbeat to detect changes to critical files, like binaries and configuration files, and identify potential security policy violations.\n\n#### The following steps should be executed in order to add the Auditbeat on a Linux System:\n- Elastic provides repositories available for APT and YUM-based distributions. Note that we provide binary packages, but no source packages.\n- To install the APT and YUM repositories follow the setup instructions in this [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setup-repositories.html).\n- To run Auditbeat on Docker follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-docker.html).\n- To run Auditbeat on Kubernetes follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-kubernetes.html).\n- For complete “Setup and Run Auditbeat” information refer to the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setting-up-and-running.html).\n- Good luck!\n',
    merged_version:
      '## Setup\n\nThis rule requires data coming in from one of the following integrations:\n- Elastic Defend\n- Auditbeat\n- Custom Windows Event Logs\n\n### Elastic Defend Integration Setup\nElastic Defend is integrated into the Elastic Agent using Fleet. Upon configuration, the integration allows the Elastic Agent to monitor events on your host and send data to the Elastic Security app.\n\n#### Prerequisite Requirements:\n- Fleet is required for Elastic Defend.\n- To configure Fleet Server refer to the [documentation](https://www.elastic.co/guide/en/fleet/current/fleet-server.html).\n\n#### The following steps should be executed in order to add the Elastic Defend integration on a Linux System:\n- Go to the Kibana home page and click "Add integrations".\n- In the query bar, search for "Elastic Defend" and select the integration to see more details about it.\n- Click "Add Elastic Defend".\n- Configure the integration name and optionally add a description.\n- Select the type of environment you want to protect.\n- Carefully select a configuration preset. Each preset comes with different default settings for Elastic Agent, you can further customize these later by configuring the Elastic Defend integration policy. [Helper guide](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html).\n- Enter a title for the agent policy in "New agent policy title". If other agent policies already exist, you can click the "Existing hosts" tab and select an existing policy instead.\nFor more details on Elastic Agent configuration settings, refer to the [helper guide](https://www.elastic.co/guide/en/fleet/8.10/agent-policy.html).\n- Click "Save and Continue".\n- The rule is now ready to run.\n- To complete the integration, select "Add Elastic Agent to your hosts" and continue to the next section to install the Elastic Agent on your hosts.\nFor more details on Elastic Defend refer to the [helper guide](https://www.elastic.co/guide/en/security/current/install-endpoint.html).\n\n### Auditbeat Setup\nAuditbeat is a lightweight shipper that you can install on your servers to audit the activities of users and processes on your systems. You can use Auditbeat to detect changes to critical files, like binaries and configuration files, and identify potential security policy violations.\n\n#### The following steps should be executed in order to add the Auditbeat on a Linux System:\n- Elastic provides repositories available for AXT and YUM-based distributions. Note that we provide binary packages, but no source packages.\n- To install the AXT and YUM repositories follow the setup instructions in this [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setup-repositories.html).\n- To run Auditbeat on Docker follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-docker.html).\n- To run Auditbeat on Kubernetes follow the setup instructions in the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/running-on-kubernetes.html).\n- For complete “Setup and Run Auditbeat” information refer to the [helper guide](https://www.elastic.co/guide/en/beats/auditbeat/current/setting-up-and-running.html).\n- Good luck!\n',
    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
    merge_outcome: ThreeWayMergeOutcome.Merged,
    has_update: true,
    conflict: ThreeWayDiffConflict.SOLVABLE,
  },
};
