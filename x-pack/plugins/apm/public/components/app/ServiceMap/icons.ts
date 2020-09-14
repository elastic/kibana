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
import awsIcon from './icons/aws.svg';
import cassandraIcon from './icons/cassandra.svg';
import databaseIcon from './icons/database.svg';
import defaultIconImport from './icons/default.svg';
import documentsIcon from './icons/documents.svg';
import elasticsearchIcon from './icons/elasticsearch.svg';
import globeIcon from './icons/globe.svg';
import graphqlIcon from './icons/graphql.svg';
import grpcIcon from './icons/grpc.svg';
import handlebarsIcon from './icons/handlebars.svg';
import kafkaIcon from './icons/kafka.svg';
import mongodbIcon from './icons/mongodb.svg';
import mysqlIcon from './icons/mysql.svg';
import postgresqlIcon from './icons/postgresql.svg';
import redisIcon from './icons/redis.svg';
import websocketIcon from './icons/websocket.svg';
import javaIcon from '../../shared/AgentIcon/icons/java.svg';
import { getAgentIcon } from '../../shared/AgentIcon/get_agent_icon';

export const defaultIcon = defaultIconImport;

const defaultTypeIcons: { [key: string]: string } = {
  cache: databaseIcon,
  db: databaseIcon,
  ext: globeIcon,
  external: globeIcon,
  messaging: documentsIcon,
  resource: globeIcon,
};

const typeIcons: { [key: string]: { [key: string]: string } } = {
  aws: {
    servicename: awsIcon,
  },
  db: {
    cassandra: cassandraIcon,
    elasticsearch: elasticsearchIcon,
    mongodb: mongodbIcon,
    mysql: mysqlIcon,
    postgresql: postgresqlIcon,
    redis: redisIcon,
  },
  external: {
    graphql: graphqlIcon,
    grpc: grpcIcon,
    websocket: websocketIcon,
  },
  messaging: {
    jms: javaIcon,
    kafka: kafkaIcon,
  },
  template: {
    handlebars: handlebarsIcon,
  },
};

function getSpanIcon(type?: string, subtype?: string) {
  if (!type) {
    return;
  }

  const types = type ? typeIcons[type] : {};
  if (subtype && types && subtype in types) {
    return types[subtype];
  }
  return defaultTypeIcons[type] || defaultIcon;
}

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
