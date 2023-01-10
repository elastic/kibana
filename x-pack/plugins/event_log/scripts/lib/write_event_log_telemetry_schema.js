#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const LineWriter = require('./line_writer');
const { getEventLogTelemetryContents } = require('../template/get_event_log_telemetry_contents');
const { logError, writeGeneratedFile } = require('./utils');

const EVENT_LOG_CONFIG_SCHEMA_FILE =
  '../../alerting/server/usage/generated/event_log_telemetry_types.ts';

const excludeList = [
  'event.risk_score',
  'event.risk_score_norm',
  'event.sequence',
  'event.severity',
  'kibana.alert.rule.execution.status_order',
];

const aggTypeMapping = {
  'kibana.alert.rule.execution.metrics.number_of_generated_actions': 'percentile',
  'kibana.alert.rule.execution.metrics.number_of_triggered_actions': 'percentile',
  'kibana.alert.rule.execution.metrics.alert_counts.active': 'percentile',
  'kibana.alert.rule.execution.metrics.alert_counts.new': 'percentile',
  'kibana.alert.rule.execution.metrics.alert_counts.recovered': 'percentile',
};

module.exports = {
  writeEventLogTelemetrySchema,
};

function writeEventLogTelemetrySchema(elSchema) {
  const lineWriters = {
    SCHEMA: LineWriter.createLineWriter(),
    SCHEMA_BY_TYPE: LineWriter.createLineWriter(),
    DEFAULT_VALS: LineWriter.createLineWriter(),
    DEFAULT_VALS_BY_TYPE: LineWriter.createLineWriter(),
    MAPPINGS: LineWriter.createLineWriter(),
    AGGREGATIONS: LineWriter.createLineWriter(),
    AGG_TYPE: LineWriter.createLineWriter(),
  };

  generateSchemaLines(lineWriters, null, elSchema.mappings);

  // last line will have an extraneous comma
  const formattedLines = Object.keys(lineWriters).reduce((acc, key) => {
    return {
      ...acc,
      [key]: lineWriters[key].getContent().replace(/,$/, ''),
    };
  }, {});

  const contents = getEventLogTelemetryContents(formattedLines);
  const schemaCode = `${contents}\n`;

  writeGeneratedFile(EVENT_LOG_CONFIG_SCHEMA_FILE, schemaCode);
  console.log('generated:', EVENT_LOG_CONFIG_SCHEMA_FILE);
}

const NumberTypes = new Set(['integer', 'float', 'long']);

function getNormalizedFieldName(fieldName) {
  // remove 'kibana.alert.rule.execution.metrics.' prefix if it exists
  return fieldName.replace('kibana.alert.rule.execution.metrics.', '').replaceAll('.', '_');
}

function generateSchemaLines(lineWriters, prop, mappings, fullFieldName = '') {
  if (mappings == null) return;

  if (mappings.type) {
    if (NumberTypes.has(mappings.type)) {
      if (!excludeList.includes(fullFieldName)) {
        const fieldName = getNormalizedFieldName(fullFieldName);
        const aggType = aggTypeMapping[fullFieldName];
        switch (aggType) {
          case 'percentile':
            lineWriters.SCHEMA.addLine(`percentile_${fieldName}_per_day: PercentileValueSchema;`);
            lineWriters.SCHEMA_BY_TYPE.addLine(
              `percentile_${fieldName}_by_type_per_day: PercentileValueByTypeSchema;`
            );
            lineWriters.MAPPINGS.addLine(`percentile_${fieldName}_per_day: byPercentileSchema,`);
            lineWriters.MAPPINGS.addLine(
              `percentile_${fieldName}_by_type_per_day: byPercentileSchemaByType,`
            );
            lineWriters.DEFAULT_VALS.addLine(`percentile_${fieldName}_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },`);
            lineWriters.DEFAULT_VALS_BY_TYPE.addLine(
              `percentile_${fieldName}_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },`
            );
            lineWriters.AGGREGATIONS.addLine(`percentile_${fieldName}: {
    percentiles: {
      field: '${fullFieldName}',
      percents: [50, 90, 99],
    },
  },`);
            lineWriters.AGG_TYPE.addLine(
              `percentile_${fieldName}: AggregationsPercentilesAggregateBase;`
            );
            break;
          default: // default to avg
            lineWriters.SCHEMA.addLine(`avg_${fieldName}_per_day: AvgValueSchema;`);
            lineWriters.SCHEMA_BY_TYPE.addLine(
              `avg_${fieldName}_by_type_per_day: AvgValueByTypeSchema;`
            );
            lineWriters.MAPPINGS.addLine(`avg_${fieldName}_per_day: { type: 'long' },`);
            lineWriters.MAPPINGS.addLine(`avg_${fieldName}_by_type_per_day: byTypeSchema,`);
            lineWriters.DEFAULT_VALS.addLine(`avg_${fieldName}_per_day: 0,`);
            lineWriters.DEFAULT_VALS_BY_TYPE.addLine(`avg_${fieldName}_by_type_per_day: {},`);
            lineWriters.AGGREGATIONS.addLine(`avg_${fieldName}: {
    avg: {
      field: '${fullFieldName}',
    },
  },`);
            lineWriters.AGG_TYPE.addLine(
              `avg_${fieldName}: AggregationsSingleMetricAggregateBase;`
            );
        }
      }
      return;
    } else {
      // only handling numeric types
      return;
    }
  } else {
    // only handling objects for the rest of this function
    if (mappings.properties == null) {
      logError(`unknown properties to map: ${prop}: ${JSON.stringify(mappings)}`);
    }

    if (prop == null) {
      Object.keys(lineWriters).forEach((key) => {
        lineWriters[key].addLine(`{`);
        lineWriters[key].indent();
      });
    }

    for (const prop of Object.keys(mappings.properties)) {
      if (prop === 'meta') continue;
      generateSchemaLines(
        lineWriters,
        prop,
        mappings.properties[prop],
        fullFieldName.length > 0 ? `${fullFieldName}.${prop}` : prop
      );
    }
  }

  if (prop == null) {
    Object.keys(lineWriters).forEach((key) => {
      lineWriters[key].dedent();
      lineWriters[key].addLine('}');
    });
  }
}
