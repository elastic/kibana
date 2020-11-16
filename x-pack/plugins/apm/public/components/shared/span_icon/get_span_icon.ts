/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

export const defaultIcon = defaultIconImport;

export function getSpanIcon(type?: string, subtype?: string) {
  if (!type) {
    return;
  }

  const types = type ? typeIcons[type] : {};
  if (subtype && types && subtype in types) {
    return types[subtype];
  }
  return defaultTypeIcons[type] || defaultIcon;
}
