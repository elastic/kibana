/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import {
  AGENT_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { getAgentIcon } from '../../shared/AgentIcon/get_agent_icon';
import { defaultIcon, getSpanIcon } from '../../shared/span_icon/get_span_icon';

// IE 11 does not properly load some SVGs, which causes a runtime error and the
// map to not work at all. We would prefer to do some kind of feature detection
// rather than browser detection, but IE 11 does support SVG, just not well
// enough for our use in loading icons.
//
// This method of detecting IE is from a Stack Overflow answer:
// https://stackoverflow.com/a/21825207
//
// @ts-expect-error `documentMode` is not recognized as a valid property of `document`.
const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

export function iconForNode(node: cytoscape.NodeSingular) {
  const agentName = node.data(AGENT_NAME);
  const subtype = node.data(SPAN_SUBTYPE);
  const type = node.data(SPAN_TYPE);

  if (isIE11) {
    return defaultIcon;
  }

  return getAgentIcon(agentName) || getSpanIcon(type, subtype) || defaultIcon;
}
