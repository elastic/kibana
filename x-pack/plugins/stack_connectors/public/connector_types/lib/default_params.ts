/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const torqDefaultBody = JSON.stringify(
  {
    alert: {
      id: '{{alert.id}}',
      action_group: '{{alert.actionGroup}}',
      action_group_name: '{{alert.actionGroupName}}',
      action_subgroup: '{{alert.actionSubgroup}}',
    },
    context: {
      alerts: '{{context.alerts}}',
      results_link: '{{{context.results_link}}}',
      rule: {
        description: '{{context.rule.description}}',
        false_positives: '{{context.rule.false_positives}}',
        filters: '{{context.rule.filters}}',
        id: '{{context.rule.id}}',
        index: '{{context.rule.index}}',
        language: '{{context.rule.language}}',
        max_signals: '{{context.rule.max_signals}}',
        name: '{{context.rule.name}}',
        output_index: '{{context.rule.output_index}}',
        query: '{{context.rule.query}}',
        references: '{{context.rule.references}}',
        risk_score: '{{context.rule.risk_score}}',
        rule_id: '{{context.rule.rule_id}}',
        saved_id: '{{context.rule.saved_id}}',
        severity: '{{context.rule.severity}}',
        threat: '{{context.rule.threat}}',
        timeline_id: '{{context.rule.timeline_id}}',
        timeline_title: '{{context.rule.timeline_title}}',
        type: '{{context.rule.type}}',
        version: '{{context.rule.version}}',
      },
    },
    rule: {
      id: '{{rule.id}}',
      name: '{{rule.name}}',
      space_id: '{{rule.spaceId}}',
      tags: '{{rule.tags}}',
      type: '{{rule.type}}',
    },
    state: {
      signals_count: '{{state.signals_count}}',
    },
    date: '{{date}}',
    kibana_base_url: '{{kibanaBaseUrl}}',
  },
  null,
  4
);
