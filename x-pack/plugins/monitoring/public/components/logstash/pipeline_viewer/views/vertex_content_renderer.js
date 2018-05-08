/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import inputIcon from '@elastic/eui/src/components/icon/assets/logstash_input.svg';
import filterIcon from '@elastic/eui/src/components/icon/assets/logstash_filter.svg';
import outputIcon from '@elastic/eui/src/components/icon/assets/logstash_output.svg';
import queueIcon from '@elastic/eui/src/components/icon/assets/logstash_queue.svg';
import ifIcon from '@elastic/eui/src/components/icon/assets/logstash_if.svg';
import { PluginVertex } from '../models/graph/plugin_vertex';
import { IfVertex } from '../models/graph/if_vertex';
import { LOGSTASH } from '../../../../../common/constants';
import { formatMetric } from '../../../../lib/format_number';

// Each vertex consists of two lines (rows) of text
// - The first line shows the name and ID of the vertex
// - The second line shows stats about the vertex
// There is also an icon denoting the type of vertex

const BASE_OFFSET_LEFT_PX = 7;
const FIRST_LINE_OFFSET_TOP_PX = 18;
const SECOND_LINE_OFFSET_TOP_PX = FIRST_LINE_OFFSET_TOP_PX + 22;

const PCT_EXECUTION_OFFSET_LEFT_PX = BASE_OFFSET_LEFT_PX;
const PCT_EXECUTION_OFFSET_TOP_PX = SECOND_LINE_OFFSET_TOP_PX;

const PCT_EXECUTION_BG_OFFSET_LEFT_PX = PCT_EXECUTION_OFFSET_LEFT_PX - 4;
const PCT_EXECUTION_BG_OFFSET_TOP_PX = PCT_EXECUTION_OFFSET_TOP_PX - 15;
const PCT_EXECUTION_BG_WIDTH_PX = 43;
const PCT_EXECUTION_BG_HEIGHT_PX = 20;
const PCT_EXECUTION_BG_RADIUS_PX = 5;

const EVENT_DURATION_OFFSET_LEFT_PX = BASE_OFFSET_LEFT_PX + 50;
const EVENT_DURATION_OFFSET_TOP_PX = SECOND_LINE_OFFSET_TOP_PX;

const EVENT_DURATION_BG_OFFSET_LEFT_PX = EVENT_DURATION_OFFSET_LEFT_PX - 6;
const EVENT_DURATION_BG_OFFSET_TOP_PX = EVENT_DURATION_OFFSET_TOP_PX - 15;
const EVENT_DURATION_BG_WIDTH_PX = 89;
const EVENT_DURATION_BG_HEIGHT_PX = 20;
const EVENT_DURATION_BG_RADIUS_PX = 5;

const EVENTS_PER_SECOND_OFFSET_LEFT_PX = BASE_OFFSET_LEFT_PX + 136;
const EVENTS_PER_SECOND_OFFSET_TOP_PX = SECOND_LINE_OFFSET_TOP_PX;

const ICON_OFFSET_LEFT_PX = BASE_OFFSET_LEFT_PX + 258;
const ICON_OFFSET_TOP_PX = FIRST_LINE_OFFSET_TOP_PX + 9;

function renderHeader(colaObjects, title, subtitle) {
  const pluginHeader = colaObjects
    .append('text')
    .attr('class', 'lspvHeader')
    .attr('x', BASE_OFFSET_LEFT_PX)
    .attr('y', FIRST_LINE_OFFSET_TOP_PX);

  pluginHeader
    .append('tspan')
    .attr('class', 'lspvVertexTitle')
    .text(title);

  // For plugin vertices, either we have an explicitly-set plugin ID or an
  // auto-generated plugin ID. For explicitly-set plugin IDs, show the ID.
  pluginHeader
    .filter(d => {
      const vertex = d.vertex;
      return (vertex instanceof PluginVertex && vertex.hasExplicitId) ||
             (vertex instanceof IfVertex);
    })
    .append('tspan')
    .attr('class', 'lspvVertexSubtitle')
    .text(d => subtitle ? ` (${subtitle(d).display})` : null)
    .append('title')
    .text(d => subtitle ? subtitle(d).complete : null);
}

function renderIcon(selection, icon) {
  selection
    .append('image')
    .attr('xlink:href', icon)
    .attr('x', ICON_OFFSET_LEFT_PX)
    .attr('y', ICON_OFFSET_TOP_PX)
    .attr('height', LOGSTASH.PIPELINE_VIEWER.ICON.HEIGHT_PX)
    .attr('width', LOGSTASH.PIPELINE_VIEWER.ICON.WIDTH_PX);
}

export function enterInputVertex(inputs) {
  renderHeader(
    inputs,
    (d => d.vertex.title),
    (d => d.vertex.subtitle)
  );

  renderIcon(inputs, inputIcon);

  inputs
    .append('text')
    .attr('class', 'lspvStat')
    .attr('data-lspv-events-per-second', '')
    .attr('x', BASE_OFFSET_LEFT_PX)
    .attr('y', SECOND_LINE_OFFSET_TOP_PX);
}

export function enterProcessorVertex(processors) {
  renderHeader(
    processors,
    (d => d.vertex.title),
    (d => d.vertex.subtitle)
  );

  processors
    .append('rect')
    .attr('data-lspv-percent-execution-bg', '')
    .attr('x', PCT_EXECUTION_BG_OFFSET_LEFT_PX)
    .attr('y', PCT_EXECUTION_BG_OFFSET_TOP_PX)
    .attr('width', PCT_EXECUTION_BG_WIDTH_PX)
    .attr('height', PCT_EXECUTION_BG_HEIGHT_PX)
    .attr('ry', PCT_EXECUTION_BG_RADIUS_PX)
    .attr('rx', PCT_EXECUTION_BG_RADIUS_PX)
    .attr('fill', 'none');

  processors
    .append('text')
    .attr('class', 'lspvStat')
    .attr('data-lspv-percent-execution', '')
    .attr('x', PCT_EXECUTION_OFFSET_LEFT_PX)
    .attr('y', PCT_EXECUTION_OFFSET_TOP_PX);

  processors
    .append('rect')
    .attr('data-lspv-per-event-duration-in-millis-bg', '')
    .attr('x', EVENT_DURATION_BG_OFFSET_LEFT_PX)
    .attr('y', EVENT_DURATION_BG_OFFSET_TOP_PX)
    .attr('width', EVENT_DURATION_BG_WIDTH_PX)
    .attr('height', EVENT_DURATION_BG_HEIGHT_PX)
    .attr('ry', EVENT_DURATION_BG_RADIUS_PX)
    .attr('rx', EVENT_DURATION_BG_RADIUS_PX)
    .attr('fill', 'none');

  processors
    .append('text')
    .attr('class', 'lspvStat')
    .attr('data-lspv-per-event-duration-in-millis', '')
    .attr('x', EVENT_DURATION_OFFSET_LEFT_PX)
    .attr('y', EVENT_DURATION_OFFSET_TOP_PX);

  processors
    .append('text')
    .attr('class', 'lspvStat')
    .attr('data-lspv-events-per-second', '')
    .attr('x', EVENTS_PER_SECOND_OFFSET_LEFT_PX)
    .attr('y', EVENTS_PER_SECOND_OFFSET_TOP_PX);

  renderIcon(processors, d => d.vertex.pluginType === 'filter' ? filterIcon : outputIcon);
}

export function enterIfVertex(ifs) {
  renderHeader(
    ifs,
    (d => d.vertex.title),
    (d => d.vertex.subtitle)
  );

  renderIcon(ifs, ifIcon);
}

export function enterQueueVertex(queueVertex) {
  renderHeader(
    queueVertex,
    (d => d.vertex.title),
  );

  renderIcon(queueVertex, queueIcon);
}

export function updateInputVertex(inputs) {
  inputs.selectAll('[data-lspv-events-per-second]')
    .text(d => formatMetric(d.vertex.latestEventsPerSecond, '0.[00]a', 'e/s emitted'));
}

export function updateProcessorVertex(processors) {
  processors.selectAll('[data-lspv-percent-execution]')
    .text(d => {
      const pct = d.vertex.percentOfTotalProcessorTime || 0;
      return formatMetric(Math.round(pct), '0', '%', { prependSpace: false });
    });

  processors.selectAll('[data-lspv-percent-execution-bg]')
    .attr('fill', d => {
      return d.vertex.isTimeConsuming() ? 'orange' : 'none';
    });

  processors.selectAll('[data-lspv-per-event-duration-in-millis]')
    .text(d => formatMetric(d.vertex.latestMillisPerEvent, '0.[00]a', 'ms/e'));

  processors.selectAll('[data-lspv-per-event-duration-in-millis-bg]')
    .attr('fill', d => {
      return d.vertex.isSlow() ? 'orange' : 'none';
    });

  processors.selectAll('[data-lspv-events-per-second]')
    .text(d => formatMetric(d.vertex.latestEventsPerSecond, '0.[00]a', 'e/s received'));
}
