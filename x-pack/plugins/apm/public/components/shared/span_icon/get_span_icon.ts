/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maybe } from '../../../../common/utils/maybe';
import cassandraIcon from './icons/cassandra.svg';
import databaseIcon from './icons/database.svg';
import defaultIcon from './icons/default.svg';
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

export const typeIcons: { [type: string]: { [subType: string]: string } } = {
  aws: {
    servicename: 'logoAWS',
  },
  db: {
    cassandra: cassandraIcon,
    cosmosdb: 'logoAzure',
    dynamodb: 'logoAWS',
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
    azurequeue: 'logoAzure',
    azureservicebus: 'logoAzure',
    jms: javaIcon,
    kafka: kafkaIcon,
    sns: 'logoAWS',
    sqs: 'logoAWS',
  },
  storage: {
    azureblob: 'logoAzure',
    azurefile: 'logoAzure',
    azuretable: 'logoAzure',
    s3: 'logoAWS',
  },
  template: {
    handlebars: handlebarsIcon,
  },
};

export function getSpanIcon(type?: string, subtype?: string) {
  if (!type) {
    return defaultIcon;
  }

  const types = maybe(typeIcons[type]);

  if (subtype && types && subtype in types) {
    return types[subtype];
  }
  return defaultTypeIcons[type] || defaultIcon;
}
