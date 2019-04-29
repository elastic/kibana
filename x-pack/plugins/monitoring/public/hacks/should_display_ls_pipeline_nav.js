/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This hack is intended to do a simple string comparison of the version returned
 * as part of the `nodeSummary` metrics used in Logstash's monitoring UI.
 *
 * Older versions of Logstash are missing fields required to link to the Pipelines
 * view. In most cases we've been able to hide the Pipelines nav link by checking if
 * there are _any_ valid pipelines, because other views are aggregates of all the nodes
 * we are monitoring, the nav will still work.
 *
 * In the case of the Node detail view however, attempting the Nav will fail because
 * the server will look for values that aren't currently there. In this rare case,
 * we will simply check if the node's version supports a pipelines field. If it is less
 * than the minimum version, we simply hide the link to avoid this bad behavior.
 * @param {string} version The version number provided by the server
 * @example
 * // returns false
 * shouldDisplayLsPipelineNav('5.6.0')
 * @example
 * // returns true
 * shouldDisplayLsPipelineNav('6.4.0')
 * @example
 * // returns true
 * shouldDisplayLsPipelineNav('6.7.1')
 * @example
 * // returns false
 * shouldDisplayLsPipelineNav(undefined)
 */
export const shouldDisplayLsPipelineNav = version => version >= '6.4.0';
